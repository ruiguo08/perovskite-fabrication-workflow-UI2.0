"""Read-only extraction of BO training rows from web PostgreSQL data.

The web app stores, per batch condition, a frozen recipe snapshot (including the
spin/VCD/anneal deposition process) and, once result CSVs are associated, the
measured per-device J-V metrics. This adapter maps a condition onto the shared
BO search space (:func:`default_search_space`) and aggregates the device
metrics into a ``(X, y)`` training row per condition.

The search space itself, its mapping onto stored snapshots, and the campaign
it belongs to are configuration data (:mod:`perovskite_bo.bo_config`), not
code: this module only interprets the configuration.

``web`` imports ``perovskite_bo`` and never the reverse, so this module only uses
the core package and stdlib. Callers fetch raw rows from the web database and hand
them in; nothing here fabricates missing values.
"""

from __future__ import annotations

from statistics import fmean, median
from typing import Any, Mapping, Sequence

from .bo_config import BO_CONFIGS, DEFAULT_CAMPAIGN_ID
from .search_space import (
    SearchSpace,
    search_space_from_spec,
)

DEFAULT_WEB_CAMPAIGN_ID = DEFAULT_CAMPAIGN_ID


def search_space_for_campaign(campaign_id: str = DEFAULT_WEB_CAMPAIGN_ID) -> SearchSpace:
    """Return the BO search space configured for one campaign."""

    try:
        config = BO_CONFIGS[campaign_id]
    except KeyError as error:
        raise ValueError(f"no BO configuration for campaign {campaign_id!r}") from error
    return search_space_from_spec(config["parameters"])


def default_search_space() -> SearchSpace:
    """Return the seed campaign's deposition-only Bayesian search space.

    VCD pressure uses integer Pa so laboratory setpoints such as 150 Pa are
    representable without duplicating a differently scaled mbar field.
    """

    return search_space_for_campaign()


def bo_parameter_names() -> frozenset[str]:
    """Return the fields changed by BO; all other recipe data is campaign-fixed."""

    return frozenset(parameter.name for parameter in default_search_space().parameters)

# (search-space name, process container, step index, process field name).
# Derived from the seed campaign's feature mapping: a 3-step spin coat, a
# 3-stage VCD, and a 2-step anneal (only the first anneal step is tuned).
_FEATURE_SPECS: tuple[tuple[str, str, int, str], ...] = tuple(
    (str(entry[0]), str(entry[1]), int(entry[2]), str(entry[3]))
    for entry in BO_CONFIGS[DEFAULT_CAMPAIGN_ID]["feature_mapping"]
)
_PARAMETER_NAMES = tuple(spec[0] for spec in _FEATURE_SPECS)
_METRIC_NAMES = ("voc", "jsc", "ff", "pce")


def search_space_parameter_names() -> tuple[str, ...]:
    """Return the BO parameter names, in default_search_space order.

    Used by callers to verify a features dict lines up with the web search
    space without importing ``web`` from the core package.
    """

    return _PARAMETER_NAMES


def _resolve_feature_mapping(
    feature_mapping: Sequence[Sequence[Any]] | None,
) -> tuple[tuple[str, str, int, str], ...]:
    """Normalize a feature mapping (default: the seed campaign's mapping)."""

    if feature_mapping is None:
        return _FEATURE_SPECS
    return tuple(
        (str(entry[0]), str(entry[1]), int(entry[2]), str(entry[3]))
        for entry in feature_mapping
    )


def extract_condition_features(
    recipe_snapshot: Mapping[str, Any] | None,
    *,
    feature_mapping: Sequence[Sequence[Any]] | None = None,
) -> dict[str, Any]:
    """Map a condition recipe snapshot onto the web BO search space.

    Returns one key per search-space parameter. A step that is absent from the
    stored recipe (e.g. a 2-spin recipe has no ``spin_thin_*``) maps to ``None``
    rather than an invented value; a present field is returned unchanged.
    ``feature_mapping`` overrides the seed campaign's mapping (bo_config
    shape: ``[parameter_name, process_container, step_index, field_name]``).
    """

    specs = _resolve_feature_mapping(feature_mapping)
    process = (
        recipe_snapshot.get("deposition_process")
        if isinstance(recipe_snapshot, Mapping)
        else None
    )
    if not isinstance(process, Mapping):
        return {name: None for name, *_rest in specs}
    features: dict[str, Any] = {}
    for name, container_key, index, field in specs:
        container = process.get(container_key)
        if isinstance(container, Sequence) and not isinstance(container, (str, bytes)):
            step = container[index] if index < len(container) else None
            value = step.get(field) if isinstance(step, Mapping) else None
        else:
            value = None
        features[name] = value
    return features


# Which execution method supplies which search-space container.
_METHOD_BY_CONTAINER = {
    "spin_steps": "spin_coating",
    "vcd_stages": "vcd",
    "anneal_steps": "annealing",
}


def recorded_actual_methods(actual_snapshots_by_method: Mapping[str, Any]) -> frozenset[str]:
    """Methods whose actual process snapshot was recorded for a condition."""

    return frozenset(
        method
        for method in ("spin_coating", "vcd", "annealing")
        if isinstance(actual_snapshots_by_method.get(method), Mapping)
    )


def training_parameter_methods() -> dict[str, str]:
    """Map each search-space parameter to the execution method supplying it."""

    return {
        spec[0]: _METHOD_BY_CONTAINER[spec[1]] for spec in _FEATURE_SPECS
    }


def extract_actual_process_features(
    actual_snapshots_by_method: Mapping[str, Any],
    *,
    feature_mapping: Sequence[Sequence[Any]] | None = None,
) -> dict[str, Any] | None:
    """Map recorded *actual* perovskite process snapshots onto the search space.

    ``actual_snapshots_by_method`` maps execution method (``spin_coating``,
    ``vcd``, ``annealing``) to the recorded actual process snapshot of the
    perovskite-layer execution. Returns ``None`` when no recognized method is
    present; parameters the recorded snapshots do not supply map to ``None``,
    mirroring :func:`extract_condition_features`.
    """

    specs = _resolve_feature_mapping(feature_mapping)
    combined: dict[str, Any] = {}
    for method, container_key in (
        ("spin_coating", "spin_steps"),
        ("vcd", "vcd_stages"),
        ("annealing", "anneal_steps"),
    ):
        snapshot = actual_snapshots_by_method.get(method)
        if isinstance(snapshot, Mapping):
            combined[container_key] = snapshot.get(container_key)
    if not combined:
        return None
    features: dict[str, Any] = {}
    for name, container_key, index, field in specs:
        container = combined.get(container_key)
        if isinstance(container, Sequence) and not isinstance(container, (str, bytes)):
            step = container[index] if index < len(container) else None
            value = step.get(field) if isinstance(step, Mapping) else None
        else:
            value = None
        features[name] = value
    return features


def _select_representative_measurements(
    entries: Sequence[Mapping[str, Any] | None],
    representative: str,
) -> list[Mapping[str, Any]]:
    """Collapse re-measurements to one entry per (device, direction).

    A physical device measured more than once (re-uploaded result files)
    must not gain weight in a training target. Entries carrying v2
    provenance (``fabrication_device_id`` + ``direction``) are grouped by
    that pair; ``latest`` keeps the entry from the most recently uploaded
    file, ``mean`` averages the metric values across the group. Entries
    without provenance (legacy callers) each stand for themselves.
    """

    groups: dict[tuple[Any, ...], list[Mapping[str, Any]]] = {}
    for index, entry in enumerate(entries):
        if not isinstance(entry, Mapping):
            continue
        device_id = entry.get("fabrication_device_id")
        direction = entry.get("direction")
        if device_id is None or direction is None:
            key: tuple[Any, ...] = ("__entry__", index)
        else:
            key = ("device-direction", device_id, str(direction))
        groups.setdefault(key, []).append(entry)
    selected: list[Mapping[str, Any]] = []
    for group in groups.values():
        if len(group) == 1 or representative == "latest":
            selected.append(
                max(
                    group,
                    key=lambda entry: (
                        str(entry.get("result_file_created_at") or ""),
                        str(entry.get("result_file_id") or ""),
                    ),
                )
            )
            continue
        merged: dict[str, Any] = {}
        for name in _METRIC_NAMES:
            values = [
                entry[name]
                for entry in group
                if isinstance(entry.get(name), (int, float))
            ]
            merged[name] = fmean(values) if values else None
        hysteresis_values = [
            float(entry["hysteresis_index"])
            for entry in group
            if isinstance(entry.get("hysteresis_index"), (int, float))
        ]
        merged["hysteresis_index"] = (
            fmean(hysteresis_values) if hysteresis_values else None
        )
        # The merged representative must keep the group's provenance so
        # downstream counting (device/substrate) and per-direction
        # breakdowns still see it.
        for provenance_key in (
            "direction",
            "fabrication_device_id",
            "fabrication_substrate_id",
        ):
            if group[0].get(provenance_key) is not None:
                merged[provenance_key] = group[0][provenance_key]
        selected.append(merged)
    return selected


def extract_result_metrics(
    device_metrics: Sequence[Mapping[str, Any] | None],
    *,
    representative: str = "latest",
) -> dict[str, Any] | None:
    """Aggregate per-device J-V metrics into one condition-level summary.

    Each entry is a parsed device metric dict with ``voc``/``jsc``/``ff``/``pce``
    (the values are taken as-is; no conversion is applied) and optionally a
    ``hysteresis_index``. Entries may carry v2 provenance —
    ``fabrication_device_id``, ``direction``, ``result_file_id``,
    ``result_file_created_at`` — in which case re-measurements of one
    physical device collapse to a single representative entry per
    (device, direction) before aggregation (``representative``: ``latest``
    by upload time, or ``mean`` across uploads), so re-measured devices do
    not gain target weight. The summary counts distinct physical devices
    (``device_count``) separately from raw measurement entries
    (``scan_count``) and distinct fabrication substrates (``n_substrates``),
    and reports per-direction medians in ``per_direction``. Entries without
    provenance each stand for themselves, preserving legacy behavior.
    Returns ``None`` when no device carries usable metrics, so an
    unmeasured condition is distinguishable from a fabricated zero.
    """

    usable = [
        entry
        for entry in device_metrics
        if isinstance(entry, Mapping)
        and any(
            isinstance(entry.get(name), (int, float))
            for name in _METRIC_NAMES
        )
    ]
    if not usable:
        return None
    representatives = _select_representative_measurements(usable, representative)
    summary: dict[str, Any] = {
        "device_count": len(
            {
                entry.get("fabrication_device_id", f"__entry_{index}__")
                for index, entry in enumerate(representatives)
            }
        ),
        "scan_count": len(usable),
        "n_substrates": len(
            {
                entry.get("fabrication_substrate_id")
                for entry in representatives
                if entry.get("fabrication_substrate_id") is not None
            }
        ),
        "representative_rule": representative,
    }
    for name in _METRIC_NAMES:
        values = [
            entry[name]
            for entry in representatives
            if isinstance(entry.get(name), (int, float))
        ]
        summary[name] = median(values) if values else None
    pce_values = [
        entry["pce"]
        for entry in representatives
        if isinstance(entry.get("pce"), (int, float))
    ]
    if pce_values:
        summary["pce_mean"] = fmean(pce_values)
        summary["pce_best"] = max(pce_values)
    else:
        summary["pce_mean"] = None
        summary["pce_best"] = None
    hysteresis_values = [
        float(entry["hysteresis_index"])
        for entry in representatives
        if isinstance(entry.get("hysteresis_index"), (int, float))
    ]
    summary["hysteresis_index"] = (
        median(hysteresis_values) if hysteresis_values else None
    )
    per_direction: dict[str, dict[str, Any]] = {}
    for direction in ("forward", "reverse"):
        direction_entries = [
            entry
            for entry in representatives
            if entry.get("direction") == direction
        ]
        if not direction_entries:
            continue
        direction_summary: dict[str, Any] = {"count": len(direction_entries)}
        for name in _METRIC_NAMES:
            values = [
                entry[name]
                for entry in direction_entries
                if isinstance(entry.get(name), (int, float))
            ]
            direction_summary[name] = median(values) if values else None
        per_direction[direction] = direction_summary
    if per_direction:
        summary["per_direction"] = per_direction
    return summary


def build_training_rows(
    condition_rows: Sequence[Mapping[str, Any]],
    *,
    device_metrics_by_condition: Mapping[int, Sequence[Mapping[str, Any] | None]],
) -> list[dict[str, Any]]:
    """Assemble one ``(X, y)`` training row per batch condition.

    ``condition_rows`` are web ``fabrication_batch_conditions`` mappings carrying
    at least ``id``, ``condition_code``, ``condition_name`` and ``recipe_snapshot``.
    ``device_metrics_by_condition`` maps a condition id to the metric dicts of the
    devices measured for it. Rows keep the web condition ids so a caller can join
    back to batches and experiments.
    """

    rows: list[dict[str, Any]] = []
    for condition in condition_rows:
        condition_id = int(condition["id"])
        rows.append(
            {
                "batch_condition_id": condition_id,
                "condition_code": str(condition.get("condition_code", "")),
                "condition_name": str(condition.get("condition_name", "")),
                "features": extract_condition_features(condition.get("recipe_snapshot")),
                "metrics": extract_result_metrics(
                    device_metrics_by_condition.get(condition_id, [])
                ),
            }
        )
    return rows


# ---------------------------------------------------------------------------
# Training-export self-description
# ---------------------------------------------------------------------------

TRAINING_EXPORT_SCHEMA_VERSION = 3

# The 1-sun assumption is a property of the metric computation (PCE equals the
# maximum power density in mW/cm2), not of the data, so it is declared here
# instead of being silently baked in.
_TRAINING_METRIC_UNITS: dict[str, str] = {
    "device_count": "count (distinct physical devices after representative selection)",
    "scan_count": "count (raw measurement entries before representative selection)",
    "n_substrates": "count (distinct fabrication substrates)",
    "voc": "V",
    "jsc": "mA/cm2",
    "ff": "fraction (0-1)",
    "pce": "percent of 1 sun (mW/cm2 at 1 sun)",
    "pce_mean": "percent of 1 sun (mW/cm2 at 1 sun)",
    "pce_best": "percent of 1 sun (mW/cm2 at 1 sun)",
    "hysteresis_index": "dimensionless, (PCE_reverse - PCE_forward) / PCE_reverse",
}


def _feature_units() -> dict[str, str]:
    units: dict[str, str] = {}
    for name in _PARAMETER_NAMES:
        if name.endswith("_acceleration_rpm_per_s"):
            units[name] = "rpm/s"
        elif name.endswith("_rpm"):
            units[name] = "rpm"
        elif name.endswith("_seconds"):
            units[name] = "s"
        elif name.endswith("_pressure_pa"):
            units[name] = "Pa"
        elif name.endswith("_temperature_c"):
            units[name] = "degC"
        elif name.endswith("_valve"):
            units[name] = "nominal valve identifier"
        else:
            units[name] = "unspecified"
    return units


def training_export_header(
    representative_rule: str = "latest",
) -> dict[str, Any]:
    """Return the self-description block that leads every training export.

    Declares the export schema version, the field lists, the units of every
    feature and metric, the representative-selection rule in effect, and the
    measurement assumptions a downstream consumer (Bayesian optimization or
    any other analysis) must know about.
    """

    metric_fields = [
        "device_count",
        "scan_count",
        "n_substrates",
        *_METRIC_NAMES,
        "pce_mean",
        "pce_best",
        "hysteresis_index",
    ]
    return {
        "record_type": "header",
        "export_schema_version": TRAINING_EXPORT_SCHEMA_VERSION,
        "representative_rule": representative_rule,
        "feature_fields": list(_PARAMETER_NAMES),
        "measurement_fields": [
            "result_file_id",
            "result_file_created_at",
            "fabrication_device_id",
            "fabrication_substrate_id",
            "direction",
        ],
        "metric_fields": metric_fields,
        "units": {**_feature_units(), **_TRAINING_METRIC_UNITS},
        "notes": [
            "Metrics are computed from raw J-V curves assuming 1 sun "
            "(100 mW/cm2) AM1.5G illumination; uploads whose instrument-"
            "reported illumination deviates from 1 sun carry analysis-level "
            "warnings and the metrics are not rescaled.",
            "Devices flagged excluded with a recorded reason are filtered "
            "from the metrics; excluded_device_count reports how many per row.",
            "Re-measurements of one physical device (across re-uploaded "
            "result files) collapse to one representative entry per "
            "(device, direction) before aggregation: 'latest' keeps the "
            "most recently uploaded measurement, 'mean' averages the metric "
            "values across uploads. device_count counts distinct physical "
            "devices; scan_count counts raw measurement entries before the "
            "collapse; per_direction splits the medians by scan direction. "
            "--keep-all-rows emits one row per measurement instead, retaining "
            "its source result_file_id and result_file_created_at (upload time). "
            "Its row and metric representative_rule are 'all-measurements'; "
            "aggregate rows have no single source file or upload timestamp.",
            "Feature values are None where the frozen recipe snapshot has no "
            "such step (e.g. a two-spin recipe has no spin_thin_* fields); "
            "impute or drop rows downstream.",
            "feature_source marks where X values come from: 'actual' when "
            "every parameter is taken from recorded per-substrate execution "
            "snapshots, 'mixed' when missing actual parameters were filled "
            "from the frozen plan, and 'planned' when no actual snapshots "
            "were recorded. Rows whose conditions were executed under more "
            "than one actual parameter variant are split per variant and "
            "carry the substrate_ids measured under that variant.",
        ],
    }
