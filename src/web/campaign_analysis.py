"""Pure computation for the campaign read-only analysis API.

This module turns raw database rows (frozen batch conditions, result-file
analyses, device assignments, and perovskite process-execution snapshots)
into the three response layers of the campaign analysis contract —
measurement provenance, process provenance, and directional summaries —
without touching the database, HTTP, or any web-internal state. The
repository layer fetches rows and hands them in; the route layer wraps the
returned payload in response models.

Semantics deliberately mirror the reviewed training export (PR #42):

- ``latest`` selects the most recently **uploaded** result file (upload
  time, never instrument measurement time), with the file id as the
  deterministic tie-break;
- re-measurements of one physical device collapse to one representative
  entry per (device, direction) before aggregation, so re-measured devices
  do not gain weight;
- forward and reverse scans stay separate everywhere; the legacy pooled
  ``result_files.metrics`` cache is never consulted, and a legacy
  "combined" device tier is reported as a diagnostic, not pooled into a
  direction;
- device interface representative rules (manual scan choice / best-PCE
  across uploads) are a different strategy and are not used here.

Every included and excluded record is visible: exclusions, duplicate
uploads, unbound physical devices, missing directions, and legacy schemas
surface as diagnostics instead of being silently dropped. The content
digest covers every input that influences the payload (scope, rule,
source-file identity and upload times, assignment and exclusion decisions,
selected representative traces, and actual/planned snapshot hashes) and
never includes the generation time.
"""

from __future__ import annotations

import hashlib
import json
import statistics
from typing import Any, Iterable, Mapping

from perovskite_bo.web_adapter import (
    extract_actual_process_features,
    extract_condition_features,
    recorded_actual_methods,
    training_export_header,
    training_parameter_methods,
)

CAMPAIGN_ANALYSIS_RULES_VERSION = "campaign-analysis-v1"

#: Upper bound on result files analyzed per request. A campaign can grow
#: without bound; silently truncating would produce wrong statistics, so an
#: oversized scope is an explicit client error that names the boundary.
MAX_RESULT_FILES_PER_REQUEST = 100

REPRESENTATIVE_RULES = ("latest", "mean")

SCAN_DIRECTIONS = ("forward", "reverse")

_METRIC_NAMES = ("voc", "jsc", "ff", "pce")

#: Contract note shown to clients: an unmeasured substrate is missing data,
#: never evidence that fabrication failed (that is a recorded shortfall
#: deviation, not an inference).
COVERAGE_NOTE = (
    "Coverage compares measured substrates against the recorded actual "
    "substrate count when the batch is completed, and against the planned "
    "substrate count otherwise. An unmeasured substrate is missing "
    "measurement data; it is never automatically treated as a fabrication "
    "failure."
)

_UNMEASURED_FEATURE_NOTE = (
    "The current actual provenance covers recorded deposition-process "
    "parameters only. Material recipes, non-perovskite layers, and other "
    "preparation facts are not claimed to be actual."
)


def metric_units() -> dict[str, str]:
    """Units for every feature and metric, shared with the training export."""

    return dict(training_export_header()["units"])


def file_representative_trace(
    device: Mapping[str, Any], direction: str
) -> Mapping[str, Any] | None:
    """Re-derive the per-file representative scan of one direction.

    The stored per-device directional metrics are the highest-PCE valid
    scan of that direction inside the file (strictly higher PCE wins; ties
    keep the first scan in stored order — the same rule the parser applies
    when building the device record). This reproduces that choice so a
    representative entry can name the exact source trace; ``None`` when the
    file has no valid scan with metrics for the direction.
    """

    best: Mapping[str, Any] | None = None
    best_pce: float | None = None
    for trace in device.get("traces") or []:
        if not isinstance(trace, Mapping):
            continue
        if trace.get("direction") != direction:
            continue
        if not trace.get("valid"):
            continue
        metrics = trace.get("metrics")
        if not isinstance(metrics, Mapping):
            continue
        pce = metrics.get("pce")
        if not isinstance(pce, (int, float)) or isinstance(pce, bool):
            continue
        if best is None or (best_pce is None or pce > best_pce):
            best = trace
            best_pce = float(pce)
    return best


def _directional_tiers(
    device: Mapping[str, Any],
) -> list[tuple[str, Mapping[str, Any]]]:
    """Directional metric records of one analysis device.

    v7 stores one metric record per scan direction. Legacy v5 analyses keep
    a flat "combined" record after normalization; it pools directions and
    is surfaced for provenance but never enters directional summaries.
    """

    metrics = device.get("metrics")
    if not isinstance(metrics, Mapping):
        return []
    directional = [
        (direction, dict(metrics[direction]))
        for direction in SCAN_DIRECTIONS
        if isinstance(metrics.get(direction), Mapping)
    ]
    if directional:
        return directional
    combined = metrics.get("combined")
    if isinstance(combined, Mapping):
        return [("combined", dict(combined))]
    return []


def build_measurement_entries(
    *,
    file_rows: Iterable[Mapping[str, Any]],
    assignments_by_file: Mapping[int, list[Mapping[str, Any]]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """One entry per (result file, analysis device, direction).

    ``file_rows`` carry the normalized analysis JSON; ``assignments_by_file``
    maps a result file id to its device-assignment rows (authoritative
    physical bindings written with the analysis). Entries for devices
    without a physical binding keep ``fabrication_device_id=None`` so they
    remain visible without ever entering deduplicated counts. Returns the
    entries plus per-device exclusion diagnostics.
    """

    entries: list[dict[str, Any]] = []
    diagnostics: list[dict[str, Any]] = []
    excluded_devices: list[dict[str, Any]] = []
    for file_row in file_rows:
        file_id = int(file_row["id"])
        analysis = file_row["analysis"] or {}
        created_at = file_row["created_at"]
        created_at = (
            created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)
        )
        devices_by_id = {
            str(device.get("device_id")): device
            for device in analysis.get("devices", [])
            if isinstance(device, Mapping)
        }
        assigned_ids: set[str] = set()
        for assignment in assignments_by_file.get(file_id, []):
            analysis_device_id = str(assignment["analysis_device_id"])
            assigned_ids.add(analysis_device_id)
            device = devices_by_id.get(analysis_device_id)
            if device is None:
                diagnostics.append(
                    {
                        "code": "assignment-without-analysis-device",
                        "message": (
                            f"result file {file_id} assigns analysis device "
                            f"{analysis_device_id!r} that its stored analysis "
                            "no longer contains"
                        ),
                        "result_file_id": file_id,
                        "batch_condition_id": int(assignment["batch_condition_id"]),
                        "fabrication_device_id": assignment["fabrication_device_id"],
                    }
                )
                continue
            if device.get("excluded"):
                excluded_devices.append(
                    {
                        "result_file_id": file_id,
                        "analysis_device_id": analysis_device_id,
                        "reason": str(device.get("exclusion_reason", "")),
                        "fabrication_device_id": assignment["fabrication_device_id"],
                    }
                )
                continue
            bound_id = assignment["fabrication_device_id"]
            tiers = _directional_tiers(device)
            if not tiers:
                diagnostics.append(
                    {
                        "code": "no-valid-metrics",
                        "message": (
                            f"analysis device {analysis_device_id!r} of result "
                            f"file {file_id} has no usable directional metrics"
                        ),
                        "result_file_id": file_id,
                        "batch_condition_id": int(assignment["batch_condition_id"]),
                        "fabrication_device_id": bound_id,
                    }
                )
                continue
            if all(direction == "combined" for direction, _metrics in tiers):
                diagnostics.append(
                    {
                        "code": "legacy-combined-direction",
                        "message": (
                            f"analysis device {analysis_device_id!r} of result "
                            f"file {file_id} stores only a legacy combined "
                            "metric tier; it cannot join directional summaries"
                        ),
                        "result_file_id": file_id,
                        "batch_condition_id": int(assignment["batch_condition_id"]),
                        "fabrication_device_id": bound_id,
                    }
                )
            elif _has_combined_tier(device):
                diagnostics.append(
                    {
                        "code": "legacy-combined-tier-beside-directions",
                        "message": (
                            f"analysis device {analysis_device_id!r} of result "
                            f"file {file_id} keeps a legacy combined tier next "
                            "to directional metrics; only the directional "
                            "records are used"
                        ),
                        "result_file_id": file_id,
                        "batch_condition_id": int(assignment["batch_condition_id"]),
                        "fabrication_device_id": bound_id,
                    }
                )
            if bound_id is None:
                diagnostics.append(
                    {
                        "code": "unbound-device",
                        "message": (
                            f"analysis device {analysis_device_id!r} of result "
                            f"file {file_id} has no physical device binding; it "
                            "is shown but excluded from deduplicated counts "
                            "and summaries"
                        ),
                        "result_file_id": file_id,
                        "batch_condition_id": int(assignment["batch_condition_id"]),
                        "fabrication_device_id": None,
                    }
                )
            for direction, metrics in tiers:
                trace = (
                    file_representative_trace(device, direction)
                    if direction in SCAN_DIRECTIONS
                    else None
                )
                # The assignment row is the authoritative physical binding
                # written in the same transaction as the analysis; the
                # device-JSON codes are only a fallback for rows that
                # predate the joined columns.
                substrate_code = assignment.get("substrate_code") or device.get(
                    "fabrication_substrate_code"
                )
                substrate_id = (
                    assignment["fabrication_substrate_id"]
                    if assignment.get("fabrication_substrate_id") is not None
                    else device.get("fabrication_substrate_id")
                )
                entries.append(
                    {
                        "batch_condition_id": int(assignment["batch_condition_id"]),
                        "result_file_id": file_id,
                        "result_file_created_at": created_at,
                        "fabrication_device_id": bound_id,
                        "fabrication_substrate_id": substrate_id,
                        "fabrication_substrate_code": substrate_code,
                        "fabrication_device_code": assignment.get("device_code")
                        or device.get("fabrication_device_code"),
                        "analysis_device_id": analysis_device_id,
                        "direction": direction,
                        "metrics": metrics,
                        "hysteresis_index": device.get("hysteresis_index"),
                        "trace_id": str(trace.get("trace_id")) if trace else None,
                        "measured_at": trace.get("measured_at") if trace else None,
                        "metric_source": (
                            trace.get("metric_source") if trace else None
                        ),
                        "representative": False,
                        "measurement_count": 1,
                        "source_result_file_ids": [file_id],
                        # One contributing trace: the file's representative
                        # scan for this direction (None for a legacy combined
                        # tier). select_representatives widens this to every
                        # group member on the chosen entry.
                        "source_traces": [
                            {
                                "result_file_id": file_id,
                                "trace_id": (
                                    str(trace.get("trace_id")) if trace else None
                                ),
                            }
                        ],
                    }
                )
        for analysis_device_id, device in devices_by_id.items():
            # Parsed devices the file never assigned (upload saved before
            # assignment, or devices added by a later parse) must not vanish.
            if analysis_device_id in assigned_ids:
                continue
            diagnostics.append(
                {
                    "code": "unassigned-analysis-device",
                    "message": (
                        f"analysis device {analysis_device_id!r} of result "
                        f"file {file_id} has no saved assignment"
                    ),
                    "result_file_id": file_id,
                    "batch_condition_id": None,
                    "fabrication_device_id": device.get("fabrication_device_id"),
                }
            )
    if excluded_devices:
        diagnostics.append(
            {
                "code": "excluded-devices",
                "message": (
                    f"{len(excluded_devices)} device measurement(s) are excluded "
                    "with recorded reasons and never enter counts or summaries"
                ),
                "result_file_id": None,
                "batch_condition_id": None,
                "fabrication_device_id": None,
                "devices": excluded_devices,
            }
        )
    return entries, diagnostics


def _metric_number(value: Any) -> float | None:
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None

def _has_combined_tier(device: Mapping[str, Any]) -> bool:
    metrics = device.get("metrics")
    return isinstance(metrics, Mapping) and isinstance(metrics.get("combined"), Mapping)


def _metric_values(
    entries: list[Mapping[str, Any]], name: str
) -> list[float]:
    values = [_metric_number(entry.get("metrics", {}).get(name)) for entry in entries]
    return [value for value in values if value is not None]


def _average_metric_record(entries: list[Mapping[str, Any]]) -> dict[str, Any]:
    """Mean across re-measurements of one (device, direction) group.

    Averaged metrics carry no single source: source fields become null and
    the group's source files ride in ``source_result_file_ids`` so a mean
    representative never fabricates a unique origin trace.
    """

    merged_metrics: dict[str, Any] = {}
    for name in _METRIC_NAMES:
        values = _metric_values(entries, name)
        merged_metrics[name] = statistics.fmean(values) if values else None
    hysteresis = [
        _metric_number(entry.get("hysteresis_index"))
        for entry in entries
    ]
    hysteresis = [value for value in hysteresis if value is not None]
    return {
        "metrics": merged_metrics,
        "hysteresis_index": statistics.fmean(hysteresis) if hysteresis else None,
    }


def select_representatives(
    entries: list[dict[str, Any]], representative: str
) -> list[dict[str, Any]]:
    """Collapse re-measurements to one representative per (device, direction).

    Entries lacking a physical device binding (``fabrication_device_id`` is
    None) or carrying a legacy combined direction cannot be deduplicated;
    each stands for itself and is never marked representative. Raw entries
    are never destroyed: ``latest`` flags the winning entry in place, while
    ``mean`` appends one synthetic averaged entry per group whose source
    fields are null and whose ``source_result_file_ids`` list every upload,
    so a mean representative never fabricates a unique origin trace.
    """

    groups: dict[tuple[Any, ...], list[dict[str, Any]]] = {}
    for entry in entries:
        if (
            entry["fabrication_device_id"] is None
            or entry["direction"] not in SCAN_DIRECTIONS
        ):
            continue
        key = ("device-direction", entry["fabrication_device_id"], entry["direction"])
        groups.setdefault(key, []).append(entry)
    for group in groups.values():
        source_file_ids = sorted({int(entry["result_file_id"]) for entry in group})
        # Every source file's contributing trace rides on the representative
        # so the content digest (and any consumer) can trace a collapsed
        # group back to each upload's exact scan — a mean representative
        # never hides which traces it averaged.
        source_traces = [
            {"result_file_id": int(entry["result_file_id"]), "trace_id": entry.get("trace_id")}
            for entry in sorted(
                group,
                key=lambda entry: (int(entry["result_file_id"]), str(entry.get("trace_id") or "")),
            )
        ]
        if representative == "latest" or len(group) == 1:
            chosen = max(
                group,
                key=lambda entry: (
                    str(entry["result_file_created_at"]),
                    int(entry["result_file_id"]),
                ),
            )
            chosen["representative"] = True
            chosen["measurement_count"] = len(group)
            chosen["source_result_file_ids"] = source_file_ids
            chosen["source_traces"] = source_traces
            continue
        merged = _average_metric_record(group)
        merged.update(
            {
                "batch_condition_id": group[0]["batch_condition_id"],
                "result_file_id": None,
                "result_file_created_at": None,
                "fabrication_device_id": group[0]["fabrication_device_id"],
                "fabrication_substrate_id": group[0]["fabrication_substrate_id"],
                "fabrication_substrate_code": group[0]["fabrication_substrate_code"],
                "fabrication_device_code": group[0]["fabrication_device_code"],
                "analysis_device_id": group[0]["analysis_device_id"],
                "direction": group[0]["direction"],
                "trace_id": None,
                "measured_at": None,
                "metric_source": None,
                "representative": True,
                "measurement_count": len(group),
                "source_result_file_ids": source_file_ids,
                "source_traces": source_traces,
            }
        )
        entries.append(merged)
    return entries


def missing_direction_diagnostics(
    entries: list[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    """Aggregated diagnostic for physical devices lacking one scan direction.

    A device measured forward but never reverse (or the other way around,
    across every upload in scope) is a data-quality fact the workbench must
    surface: the missing direction is absent from summaries, not zero.
    Combined-tier and unbound devices are reported by their own codes.
    """

    directions_by_device: dict[int, set[str]] = {}
    codes_by_device: dict[int, str | None] = {}
    for entry in entries:
        device_id = entry.get("fabrication_device_id")
        if device_id is None or entry.get("direction") not in SCAN_DIRECTIONS:
            continue
        directions_by_device.setdefault(int(device_id), set()).add(
            str(entry["direction"])
        )
        codes_by_device.setdefault(int(device_id), entry.get("fabrication_device_code"))
    incomplete = {
        device_id: directions
        for device_id, directions in directions_by_device.items()
        if set(SCAN_DIRECTIONS) - directions
    }
    if not incomplete:
        return []
    missing_forward = sorted(
        device_id
        for device_id, directions in incomplete.items()
        if "forward" not in directions
    )
    missing_reverse = sorted(
        device_id
        for device_id, directions in incomplete.items()
        if "reverse" not in directions
    )
    parts = []
    if missing_forward:
        parts.append(f"{len(missing_forward)} without a forward scan")
    if missing_reverse:
        parts.append(f"{len(missing_reverse)} without a reverse scan")
    return [
        {
            "code": "missing-direction",
            "message": (
                "; ".join(parts)
                + " across every upload in scope; the missing direction is "
                "absent from summaries, not zero"
            ),
            "result_file_id": None,
            "batch_condition_id": None,
            "fabrication_device_id": None,
            "fabrication_device_ids": sorted(incomplete),
            "device_codes": [
                codes_by_device.get(device_id) for device_id in sorted(incomplete)
            ],
        }
    ]


def group_actual_variants(
    execution_rows: Iterable[Mapping[str, Any]],
) -> dict[int, list[dict[str, Any]]]:
    """Group substrates by their recorded perovskite actual snapshots.

    ``execution_rows`` are perovskite-layer spin/VCD/anneal execution
    member rows with a non-null actual snapshot. Substrates sharing one
    (method, snapshot) combination were fabricated under the same actual
    parameter variant. Returns one variant list per batch condition in
    first-seen order, each with the original snapshot content per method.
    """

    substrate_variants: dict[int, dict[int, dict[str, str]]] = {}
    snapshots_by_hash: dict[int, dict[tuple[str, str], Any]] = {}
    for row in execution_rows:
        condition_id = int(row["batch_condition_id"])
        substrate_id = int(row["substrate_id"])
        method = str(row["method"])
        snapshot = row["actual_process_snapshot"]
        digest = hashlib.sha256(
            json.dumps(snapshot, sort_keys=True).encode("utf-8")
        ).hexdigest()
        substrate_variants.setdefault(condition_id, {}).setdefault(
            substrate_id, {}
        )[method] = digest
        snapshots_by_hash.setdefault(condition_id, {})[(method, digest)] = snapshot
    variants_by_condition: dict[int, dict[tuple, dict[str, Any]]] = {}
    for condition_id, per_substrate in substrate_variants.items():
        for substrate_id, method_hashes in per_substrate.items():
            key = tuple(sorted(method_hashes.items()))
            variant = variants_by_condition.setdefault(condition_id, {}).setdefault(
                key, {"methods": {}, "substrate_ids": set()}
            )
            variant["substrate_ids"].add(substrate_id)
            for method, digest in method_hashes.items():
                variant["methods"][method] = snapshots_by_hash[condition_id][
                    (method, digest)
                ]
    return {
        condition_id: list(variants.values())
        for condition_id, variants in variants_by_condition.items()
    }


def build_condition_variants(
    condition_rows: Iterable[Mapping[str, Any]],
    variants_by_condition: Mapping[int, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    """Process-origin layer: planned features plus one row per actual variant.

    Follows the training-export fallback semantics: parameters missing from
    a recorded actual snapshot stay None when their execution method ran
    (the step was not executed) and fall back to the frozen plan only when
    the whole method lacks an actual record (feature_source "mixed"). A
    synthetic planned variant carries substrates without recorded actuals.
    """

    parameter_methods = training_parameter_methods()
    rows: list[dict[str, Any]] = []
    for source in condition_rows:
        condition_id = int(source["id"])
        planned_features = extract_condition_features(source["recipe_snapshot"])
        variants = variants_by_condition.get(condition_id) or []
        variant_rows: list[dict[str, Any]] = []
        if not variants:
            # Mirror the training export: a condition without recorded
            # actuals keeps one planned row so the workbench can still show
            # the frozen plan and its measurements.
            variant_rows.append(
                {
                    "variant_index": 0,
                    "feature_source": "planned",
                    "features": dict(planned_features),
                    "parameter_origins": {name: "planned" for name in planned_features},
                    "fallback_reasons": {
                        "no-actual-snapshot": (
                            "no perovskite actual process snapshot was recorded"
                        )
                    },
                    "actual_snapshot_hashes": {},
                    "substrate_ids": [],
                }
            )
        for variant_index, variant in enumerate(variants):
            recorded = recorded_actual_methods(variant["methods"])
            actual_features = extract_actual_process_features(variant["methods"])
            if actual_features is None:
                features = dict(planned_features)
                feature_source = "planned"
                origins = {name: "planned" for name in features}
                reasons = {
                    "no-actual-snapshot": (
                        "no perovskite actual process snapshot was recorded"
                    )
                }
            else:
                features = dict(actual_features)
                feature_source = "actual"
                origins: dict[str, str] = {name: "actual" for name in features}
                reasons: dict[str, str] = {}
                for name, value in features.items():
                    if value is not None or planned_features.get(name) is None:
                        continue
                    if parameter_methods[name] in recorded:
                        # The method ran and its actual snapshot was recorded,
                        # but it does not contain this step (e.g. a two-spin
                        # actual against a three-spin plan): the step was not
                        # executed and must stay None rather than being
                        # restored from the plan.
                        origins[name] = "not_executed"
                        continue
                    features[name] = planned_features[name]
                    origins[name] = "planned"
                    feature_source = "mixed"
                    reasons[name] = (
                        "the execution method has no recorded actual snapshot; "
                        "the frozen plan value is used"
                    )
            variant_rows.append(
                {
                    "variant_index": variant_index,
                    "feature_source": feature_source,
                    "features": features,
                    "parameter_origins": origins,
                    "fallback_reasons": reasons,
                    "actual_snapshot_hashes": {
                        method: hashlib.sha256(
                            json.dumps(snapshot, sort_keys=True).encode("utf-8")
                        ).hexdigest()
                        for method, snapshot in variant["methods"].items()
                    },
                    "substrate_ids": sorted(variant["substrate_ids"]),
                }
            )
        rows.append(
            {
                "batch_condition_id": condition_id,
                "planned_features": planned_features,
                "feature_note": _UNMEASURED_FEATURE_NOTE,
                "variants": variant_rows,
            }
        )
    return rows


def _descriptive(values: list[float]) -> dict[str, Any]:
    return {
        "count": len(values),
        "median": statistics.median(values) if values else None,
        "mean": statistics.fmean(values) if values else None,
        "min": min(values) if values else None,
        "max": max(values) if values else None,
    }


def _substrate_equal_weighted(
    entries: list[Mapping[str, Any]], name: str
) -> dict[str, Any]:
    """Equally weighted substrate summary of one metric.

    Device values are first averaged per substrate (devices on one
    substrate share fabrication and treatment), then the substrate means
    are summarized. This is the exchangeable-unit view; the device-level
    statistics stay descriptive and are reported under a separate name.
    """

    buckets: dict[Any, list[float]] = {}
    for entry in entries:
        value = _metric_number(entry.get("metrics", {}).get(name))
        if value is None:
            continue
        substrate = entry.get("fabrication_substrate_id")
        # Without a substrate attribution the device itself is the only
        # known unit; it still contributes, honestly labeled by its key.
        buckets.setdefault(
            ("substrate", substrate) if substrate is not None else ("device", entry.get("fabrication_device_id")),
            [],
        ).append(value)
    substrate_means = [statistics.fmean(values) for values in buckets.values()]
    return {
        "unit_count": len(substrate_means),
        "mean": statistics.fmean(substrate_means) if substrate_means else None,
    }


def build_summaries(
    *,
    condition_rows: Iterable[Mapping[str, Any]],
    condition_variant_rows: list[dict[str, Any]],
    representative_entries: list[Mapping[str, Any]],
    representative_rule: str,
) -> list[dict[str, Any]]:
    """Summary layer: forward/reverse separate, per condition variant.

    Variant definitions come from the same :func:`build_condition_variants`
    rows the process-origin layer reports, so summaries and provenance can
    never disagree. Only entries bound to a physical device and a real scan
    direction enter. ``device_statistics`` are device-level descriptive
    values; ``substrate_statistics`` are the equally weighted substrate-unit
    means used by the control/target comparison. Unbound and combined-tier
    entries never appear here — they ride in the measurement layer and
    diagnostics instead.
    """

    variants_by_condition: dict[int, list[dict[str, Any]]] = {}
    for row in condition_variant_rows:
        variants_by_condition[int(row["batch_condition_id"])] = list(
            row["variants"]
        )
    usable = [
        entry
        for entry in representative_entries
        if entry.get("representative")
        and entry.get("fabrication_device_id") is not None
        and entry.get("direction") in SCAN_DIRECTIONS
    ]
    by_condition: dict[int, list[Mapping[str, Any]]] = {}
    for entry in usable:
        by_condition.setdefault(int(entry["batch_condition_id"]), []).append(entry)
    covered_substrates: dict[int, set[int]] = {}
    for condition_id, variants in variants_by_condition.items():
        for variant in variants:
            if variant["substrate_ids"]:
                covered_substrates.setdefault(condition_id, set()).update(
                    variant["substrate_ids"]
                )
    summaries: list[dict[str, Any]] = []
    for source in condition_rows:
        condition_id = int(source["id"])
        variants = variants_by_condition.get(condition_id) or []
        entries = by_condition.get(condition_id, [])
        covered = covered_substrates.get(condition_id, set())
        # One summary block per variant reported by the process-origin layer
        # (a condition without actuals carries one planned row there). When
        # actual variants exist, a final synthetic planned variant parks
        # measurements whose substrate has no recorded actual snapshot
        # (cancelled without recording, or analyses predating substrate
        # attribution) so they cannot silently disappear.
        variant_defs: list[dict[str, Any]] = [
            {
                "variant_index": int(variant["variant_index"]),
                "feature_source": str(variant["feature_source"]),
                "substrate_ids": list(variant["substrate_ids"]),
            }
            for variant in variants
        ]
        if variant_defs and any(
            variant_def["substrate_ids"] for variant_def in variant_defs
        ):
            variant_defs.append(
                {
                    "variant_index": len(variant_defs),
                    "feature_source": "planned",
                    "substrate_ids": [],
                }
            )
        for variant_def in variant_defs:
            variant_substrate_ids = set(variant_def["substrate_ids"])
            for direction in SCAN_DIRECTIONS:
                direction_entries = []
                for entry in entries:
                    if entry["direction"] != direction:
                        continue
                    substrate_id = entry.get("fabrication_substrate_id")
                    if variant_substrate_ids:
                        if substrate_id in variant_substrate_ids:
                            direction_entries.append(entry)
                    elif substrate_id not in covered:
                        direction_entries.append(entry)
                if not direction_entries:
                    continue
                metrics: dict[str, Any] = {}
                device_statistics: dict[str, Any] = {}
                substrate_statistics: dict[str, Any] = {}
                for name in _METRIC_NAMES:
                    values = _metric_values(direction_entries, name)
                    metrics[name] = (
                        statistics.median(values) if values else None
                    )
                    device_statistics[name] = _descriptive(values)
                    substrate_statistics[name] = _substrate_equal_weighted(
                        direction_entries, name
                    )
                pce_values = _metric_values(direction_entries, "pce")
                substrate_count = len(
                    {
                        entry.get("fabrication_substrate_id")
                        for entry in direction_entries
                        if entry.get("fabrication_substrate_id") is not None
                    }
                )
                summaries.append(
                    {
                        "batch_condition_id": condition_id,
                        "variant_index": variant_def["variant_index"],
                        "feature_source": variant_def["feature_source"],
                        "direction": direction,
                        "representative_rule": representative_rule,
                        "device_count": len(
                            {
                                entry.get("fabrication_device_id")
                                for entry in direction_entries
                            }
                        ),
                        "substrate_count": substrate_count,
                        "measurement_count": sum(
                            int(entry.get("measurement_count", 1))
                            for entry in direction_entries
                        ),
                        "metrics": metrics,
                        "device_statistics": device_statistics,
                        "substrate_statistics": substrate_statistics,
                        "pce_mean": (
                            statistics.fmean(pce_values) if pce_values else None
                        ),
                        "pce_best": max(pce_values) if pce_values else None,
                    }
                )
    return summaries


def _comparison_provenance_conflict(
    condition: Mapping[str, Any],
    variants: list[dict[str, Any]],
    entries: list[Mapping[str, Any]],
) -> str | None:
    """Why a condition's measurements must not join one comparison.

    Returns ``"multi-variant"`` when the condition was executed under more
    than one actual parameter variant, and ``"mixed-provenance"`` when a
    recorded actual variant exists while measured substrates fall outside
    every recorded variant (planned-provenance leftovers). Both would
    silently pool different provenance into one mean; ``None`` means every
    measured device shares one provenance (all planned, or all inside the
    single actual variant).
    """

    actual_variants = [variant for variant in variants if variant["substrate_ids"]]
    if len(actual_variants) > 1:
        return "multi-variant"
    if actual_variants:
        covered: set[int] = set()
        for variant in actual_variants:
            covered.update(int(value) for value in variant["substrate_ids"])
        leftover = [
            entry
            for entry in entries
            if entry.get("fabrication_substrate_id") not in covered
        ]
        if leftover:
            return "mixed-provenance"
    return None


def build_comparisons(
    *,
    condition_rows: Iterable[Mapping[str, Any]],
    condition_variant_rows: list[dict[str, Any]],
    representative_entries: list[Mapping[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Same-batch control/target descriptive comparison.

    Control and target means are the equally weighted substrate-unit means
    (never pooled devices). A condition whose measurements mix provenance —
    several actual parameter variants, or an actual variant beside
    planned-provenance leftovers — is ambiguous for comparison; the
    comparison is then skipped with a diagnostic instead of silently mixing
    (the same variant membership the summaries layer reports decides). These
    are descriptive differences only: no p value, effect size, or causal
    claim is produced.
    """

    variants_by_condition: dict[int, list[dict[str, Any]]] = {}
    for row in condition_variant_rows:
        variants_by_condition[int(row["batch_condition_id"])] = list(
            row["variants"]
        )

    usable = [
        entry
        for entry in representative_entries
        if entry.get("representative")
        and entry.get("fabrication_device_id") is not None
        and entry.get("direction") in SCAN_DIRECTIONS
    ]
    by_condition: dict[int, list[Mapping[str, Any]]] = {}
    for entry in usable:
        by_condition.setdefault(int(entry["batch_condition_id"]), []).append(entry)
    comparisons: list[dict[str, Any]] = []
    diagnostics: list[dict[str, Any]] = []
    rows = list(condition_rows)
    by_batch: dict[int, dict[str, list[Mapping[str, Any]]]] = {}
    for source in rows:
        by_batch.setdefault(int(source["batch_id"]), {}).setdefault(
            str(source["role"]), []
        ).append(source)

    def _skip_diagnostic(
        condition: Mapping[str, Any], reason: str, batch: int
    ) -> dict[str, Any]:
        if reason == "multi-variant":
            message = (
                f"condition {condition['condition_code']!r} was executed "
                "under more than one actual variant; its comparison is "
                "skipped instead of mixing them"
            )
        else:
            message = (
                f"condition {condition['condition_code']!r} mixes recorded "
                "actual-variant measurements with planned-provenance "
                "leftovers; its comparison is skipped instead of pooling "
                "different provenance"
            )
        return {
            "code": (
                "comparison-skipped-multi-variant"
                if reason == "multi-variant"
                else "comparison-skipped-mixed-provenance"
            ),
            "message": message,
            "batch_condition_id": int(condition["id"]),
            "batch_id": batch,
            "result_file_id": None,
            "fabrication_device_id": None,
        }

    for batch_id, roles in sorted(by_batch.items()):
        controls = roles.get("control", [])
        targets = roles.get("target", [])
        if not controls:
            continue
        control = controls[0]
        for target in targets:
            sides = [
                (control, by_condition.get(int(control["id"]), [])),
                (target, by_condition.get(int(target["id"]), [])),
            ]
            conflict: str | None = None
            conflicted_condition: Mapping[str, Any] | None = None
            for condition, entries in sides:
                reason = _comparison_provenance_conflict(
                    condition,
                    variants_by_condition.get(int(condition["id"])) or [],
                    entries,
                )
                if reason is not None:
                    conflict = reason
                    conflicted_condition = condition
                    break
            if conflict is not None and conflicted_condition is not None:
                diagnostics.append(
                    _skip_diagnostic(conflicted_condition, conflict, batch_id)
                )
                continue
            for direction in SCAN_DIRECTIONS:
                control_entries = [
                    entry
                    for entry in by_condition.get(int(control["id"]), [])
                    if entry["direction"] == direction
                ]
                target_entries = [
                    entry
                    for entry in by_condition.get(int(target["id"]), [])
                    if entry["direction"] == direction
                ]
                for name in _METRIC_NAMES:
                    control_summary = _substrate_equal_weighted(
                        control_entries, name
                    )
                    target_summary = _substrate_equal_weighted(
                        target_entries, name
                    )
                    control_mean = control_summary["mean"]
                    target_mean = target_summary["mean"]
                    if control_mean is None or target_mean is None:
                        continue
                    difference = target_mean - control_mean
                    comparisons.append(
                        {
                            "batch_id": batch_id,
                            "control_batch_condition_id": int(control["id"]),
                            "target_batch_condition_id": int(target["id"]),
                            "direction": direction,
                            "metric": name,
                            "control_mean": control_mean,
                            "target_mean": target_mean,
                            "difference": difference,
                            "percent_change": (
                                None
                                if control_mean == 0
                                else difference / abs(control_mean) * 100.0
                            ),
                            "n_control_units": control_summary["unit_count"],
                            "n_target_units": target_summary["unit_count"],
                            "inference_note": (
                                "descriptive comparison of equally weighted "
                                "substrate means within one batch; no "
                                "significance test is applied"
                            ),
                        }
                    )
    return comparisons, diagnostics


def build_coverage(
    *,
    condition_rows: Iterable[Mapping[str, Any]],
    entries: list[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    """Measurement coverage per condition with the denominator basis named.

    The measured set is every substrate with at least one bound, valid
    measurement entry in scope (any upload). The denominator is the
    recorded actual substrate count when the batch completed (basis
    "actual") and the planned substrate count otherwise (basis "planned").
    """

    measured: dict[int, set[int]] = {}
    for entry in entries:
        substrate_id = entry.get("fabrication_substrate_id")
        if substrate_id is None:
            continue
        measured.setdefault(int(entry["batch_condition_id"]), set()).add(
            int(substrate_id)
        )
    rows: list[dict[str, Any]] = []
    for source in condition_rows:
        condition_id = int(source["id"])
        actual_count = source["actual_substrate_count"]
        if actual_count is not None:
            denominator_value = int(actual_count)
            denominator = "actual"
        else:
            denominator_value = int(source["planned_substrate_count"])
            denominator = "planned"
        measured_count = len(measured.get(condition_id, set()))
        rows.append(
            {
                "batch_condition_id": condition_id,
                "measured_substrate_count": measured_count,
                "denominator_basis": denominator,
                "denominator_value": denominator_value,
                "fraction": (
                    measured_count / denominator_value
                    if denominator_value > 0
                    else None
                ),
                "note": COVERAGE_NOTE,
            }
        )
    return rows


def _canonical_sha256(value: Any) -> str:
    """SHA-256 over a JSON document's canonical form (sorted keys, compact)."""

    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def build_content_digest(
    *,
    scope: Mapping[str, Any],
    condition_rows: Iterable[Mapping[str, Any]],
    file_rows: Iterable[Mapping[str, Any]],
    assignments: Iterable[Mapping[str, Any]],
    exclusions: Iterable[Mapping[str, Any]],
    representative_choices: Iterable[Mapping[str, Any]],
    variant_rows: Iterable[Mapping[str, Any]],
) -> str:
    """SHA-256 over every input that influences the payload.

    The digest covers the rules version and representative rule, each
    frozen condition's identity and content (source hash, canonical
    recipe-snapshot hash, planned and actual substrate counts that drive
    the coverage denominator), each source file's identity AND the
    canonical hash of its effective analysis JSON (trace metrics, device
    bindings, and exclusion flags all change it — the file sha256 alone
    cannot, because an analysis can be corrected without rewriting the raw
    bytes), the device-assignment and exclusion decisions, every
    representative with its per-source-file contributing trace, and the
    actual/planned snapshot hashes of every variant. The generation time is
    deliberately excluded, so repeated extraction of unchanged data is
    byte-stable while any source, parameter, selection rule, or inclusion
    decision change produces a new digest.
    """

    fingerprint = {
        "rules_version": CAMPAIGN_ANALYSIS_RULES_VERSION,
        # The campaign/batch selectors themselves are scope metadata, not
        # content: two scopes that select the same files and decisions
        # describe the same data and share one digest. The representative
        # rule is a selection rule and must be covered.
        "representative": scope["representative"],
        "conditions": sorted(
            (
                {
                    "batch_condition_id": int(row["id"]),
                    "condition_code": str(row["condition_code"]),
                    "role": str(row["role"]),
                    "source_condition_hash": str(row["source_condition_hash"]),
                    "recipe_snapshot_sha256": _canonical_sha256(
                        row["recipe_snapshot"]
                    ),
                    "planned_substrate_count": int(row["planned_substrate_count"]),
                    "actual_substrate_count": (
                        int(row["actual_substrate_count"])
                        if row["actual_substrate_count"] is not None
                        else None
                    ),
                }
                for row in condition_rows
            ),
            key=lambda row: row["batch_condition_id"],
        ),
        "files": sorted(
            (
                {
                    "id": int(row["id"]),
                    "sha256": str(row["sha256"]),
                    "created_at": (
                        row["created_at"].isoformat()
                        if hasattr(row["created_at"], "isoformat")
                        else str(row["created_at"])
                    ),
                    "analysis_schema_version": int(row["analysis_schema_version"]),
                    # The effective analysis content, not just the raw bytes:
                    # corrected analyses change the metrics without changing
                    # the file sha256.
                    "analysis_sha256": _canonical_sha256(row["analysis"]),
                }
                for row in file_rows
            ),
            key=lambda row: row["id"],
        ),
        "assignments": sorted(
            (
                {
                    "result_file_id": int(row["result_file_id"]),
                    "analysis_device_id": str(row["analysis_device_id"]),
                    "batch_condition_id": int(row["batch_condition_id"]),
                    "fabrication_device_id": row["fabrication_device_id"],
                }
                for row in assignments
            ),
            key=lambda row: (
                row["result_file_id"],
                row["analysis_device_id"],
            ),
        ),
        "exclusions": sorted(
            (
                {
                    "result_file_id": int(row["result_file_id"]),
                    "analysis_device_id": str(row["analysis_device_id"]),
                    "reason": str(row["reason"]),
                }
                for row in exclusions
            ),
            key=lambda row: (row["result_file_id"], row["analysis_device_id"]),
        ),
        "representative_choices": sorted(
            (
                {
                    "fabrication_device_id": int(row["fabrication_device_id"]),
                    "direction": str(row["direction"]),
                    # Every contributing source file with its exact trace, so
                    # a collapsed (latest or mean) group is traceable to each
                    # upload's scan; the metrics themselves ride in the
                    # per-file analysis_sha256 above.
                    "source_traces": sorted(
                        (
                            {
                                "result_file_id": int(source["result_file_id"]),
                                "trace_id": (
                                    str(source["trace_id"])
                                    if source["trace_id"] is not None
                                    else None
                                ),
                            }
                            for source in row["source_traces"]
                        ),
                        key=lambda source: (
                            source["result_file_id"],
                            source["trace_id"] or "",
                        ),
                    ),
                }
                for row in representative_choices
            ),
            key=lambda row: (row["fabrication_device_id"], row["direction"]),
        ),
        "variants": sorted(
            (
                {
                    "batch_condition_id": int(row["batch_condition_id"]),
                    "variant_index": int(row["variant_index"]),
                    "feature_source": str(row["feature_source"]),
                    "actual_snapshot_hashes": {
                        method: str(digest)
                        for method, digest in row["actual_snapshot_hashes"].items()
                    },
                    "substrate_ids": [int(value) for value in row["substrate_ids"]],
                }
                for row in variant_rows
            ),
            key=lambda row: (row["batch_condition_id"], row["variant_index"]),
        ),
    }
    canonical = json.dumps(fingerprint, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
