"""Unit tests for the web-to-BO training-row extraction adapter."""

from __future__ import annotations

import unittest
from random import Random

from perovskite_bo.bo_config import BO_CONFIGS, DEFAULT_CAMPAIGN_ID
from perovskite_bo.device_recipe import VCD_VALVES
from perovskite_bo.search_space import search_space_from_spec
from perovskite_bo.web_adapter import (
    build_training_rows,
    extract_actual_process_features,
    extract_condition_features,
    extract_result_metrics,
    search_space_for_campaign,
    search_space_parameter_names,
    training_export_header,
)


def _snapshot(**process_override) -> dict:
    return {
        "schema_version": 3,
        "device": {"schema_version": 1, "architecture": "pin"},
        "deposition_process": {
            "method": "spin_coating_vcd",
            "spin_steps": [
                {"rpm": 700, "seconds": 60, "acceleration_rpm_per_s": 500},
                {"rpm": 1500, "seconds": 10, "acceleration_rpm_per_s": 800},
                {"rpm": 4000, "seconds": 20, "acceleration_rpm_per_s": 1200},
            ],
            "vcd_stages": [
                {"valve": "VV02", "pressure_pa": 300, "seconds": 30},
                {"valve": "VV03", "pressure_pa": 150, "seconds": 20},
                {"valve": "VV06", "pressure_pa": 800, "seconds": 10},
            ],
            "anneal_steps": [
                {"temperature_c": 120, "seconds": 600},
                {"temperature_c": 100, "seconds": 60},
            ],
            **process_override,
        },
    }


class WebAdapterTests(unittest.TestCase):
    def test_feature_names_align_with_web_search_space(self) -> None:
        from perovskite_bo.web_adapter import default_search_space

        expected = [parameter.name for parameter in default_search_space().parameters]
        self.assertEqual(list(search_space_parameter_names()), expected)

    def test_extract_condition_features_maps_full_process(self) -> None:
        features = extract_condition_features(_snapshot())

        self.assertEqual(features["spin_cast_rpm"], 700)
        self.assertEqual(features["spin_cast_seconds"], 60)
        self.assertEqual(features["spin_cast_acceleration_rpm_per_s"], 500)
        self.assertEqual(features["spin_spread_rpm"], 1500)
        self.assertEqual(features["spin_spread_seconds"], 10)
        self.assertEqual(features["spin_thin_rpm"], 4000)
        self.assertEqual(features["spin_thin_acceleration_rpm_per_s"], 1200)
        self.assertEqual(features["vcd_stage1_valve"], "VV02")
        self.assertEqual(features["vcd_stage1_pressure_pa"], 300)
        self.assertEqual(features["vcd_stage2_valve"], "VV03")
        self.assertEqual(features["vcd_stage2_seconds"], 20)
        self.assertEqual(features["vcd_stage3_valve"], "VV06")
        self.assertEqual(features["vcd_stage3_pressure_pa"], 800)
        self.assertEqual(features["anneal_stage1_temperature_c"], 120)
        self.assertEqual(features["anneal_stage1_seconds"], 600)
        self.assertEqual(len(features), 20)

    def test_missing_steps_yield_none_not_fabrication(self) -> None:
        features = extract_condition_features(
            _snapshot(
                spin_steps=[
                    {"rpm": 700, "seconds": 60, "acceleration_rpm_per_s": 500}
                ],
                vcd_stages=[{"valve": "VV02", "pressure_pa": 300, "seconds": 30}],
                anneal_steps=[{"temperature_c": 120, "seconds": 600}],
            )
        )

        self.assertEqual(features["spin_cast_rpm"], 700)
        self.assertEqual(features["spin_spread_rpm"], None)
        self.assertEqual(features["spin_thin_rpm"], None)
        self.assertEqual(features["vcd_stage2_valve"], None)
        self.assertEqual(features["vcd_stage3_valve"], None)
        self.assertEqual(features["anneal_stage1_seconds"], 600)

    def test_missing_parts_map_every_feature_to_none(self) -> None:
        self.assertEqual(
            extract_condition_features({}),
            {name: None for name in search_space_parameter_names()},
        )
        self.assertEqual(
            extract_condition_features(None),
            {name: None for name in search_space_parameter_names()},
        )

    def test_extract_result_metrics_aggregates_medians_and_best(self) -> None:
        metrics = extract_result_metrics(
            [
                {"voc": 1.0, "jsc": 10.0, "ff": 60.0, "pce": 10.0},
                {"voc": 1.1, "jsc": 11.0, "ff": 70.0, "pce": 12.0},
                {"voc": 1.2, "jsc": 12.0, "ff": 80.0, "pce": 14.0},
            ]
        )

        self.assertIsNotNone(metrics)
        self.assertEqual(metrics["device_count"], 3)
        self.assertEqual(metrics["pce"], 12.0)  # median
        self.assertEqual(metrics["pce_mean"], 12.0)  # (10+12+14)/3
        self.assertEqual(metrics["pce_best"], 14.0)
        self.assertEqual(metrics["voc"], 1.1)
        self.assertEqual(metrics["jsc"], 11.0)
        self.assertEqual(metrics["ff"], 70.0)

    def test_extract_result_metrics_aggregates_hysteresis_median(self) -> None:
        metrics = extract_result_metrics(
            [
                {"voc": 1.0, "jsc": 10.0, "ff": 0.6, "pce": 10.0, "hysteresis_index": -0.2},
                {"voc": 1.1, "jsc": 11.0, "ff": 0.7, "pce": 12.0, "hysteresis_index": -0.4},
                {"voc": 1.05, "jsc": 10.5, "ff": 0.65, "pce": 11.0},
            ]
        )

        self.assertAlmostEqual(metrics["hysteresis_index"], -0.3)

    def test_extract_result_metrics_hysteresis_none_without_values(self) -> None:
        metrics = extract_result_metrics(
            [{"voc": 1.0, "jsc": 10.0, "ff": 0.6, "pce": 10.0}]
        )

        self.assertIsNone(metrics["hysteresis_index"])

    def test_training_export_header_is_self_describing(self) -> None:
        header = training_export_header()

        self.assertEqual(header["record_type"], "header")
        self.assertEqual(header["export_schema_version"], 2)
        self.assertEqual(
            tuple(header["feature_fields"]), search_space_parameter_names()
        )
        self.assertIn("hysteresis_index", header["metric_fields"])
        self.assertEqual(header["units"]["jsc"], "mA/cm2")
        self.assertEqual(header["units"]["vcd_stage1_pressure_pa"], "Pa")
        self.assertTrue(
            any("1 sun" in note for note in header["notes"]),
            "the 1-sun assumption must be declared",
        )
        self.assertTrue(
            any("excluded" in note for note in header["notes"]),
            "the exclusion semantics must be declared",
        )
        self.assertTrue(
            any("feature_source" in note for note in header["notes"]),
            "the feature provenance semantics must be declared",
        )

    def test_extract_result_metrics_none_without_usable_devices(self) -> None:
        self.assertIsNone(extract_result_metrics([]))
        self.assertIsNone(extract_result_metrics([None, {"pce": None}]))
        # Devices that partially carry metrics still contribute the available ones.
        partial = extract_result_metrics([{"pce": 10.0}, {}])
        self.assertEqual(partial["pce"], 10.0)
        self.assertIsNone(partial["voc"])

    def test_build_training_rows_composes_features_and_metrics(self) -> None:
        conditions = [
            {
                "id": 7,
                "condition_code": "T1",
                "condition_name": "Target 1",
                "recipe_snapshot": _snapshot(),
            }
        ]
        rows = build_training_rows(
            conditions,
            device_metrics_by_condition={
                7: [{"voc": 1.0, "jsc": 10.0, "ff": 60.0, "pce": 10.0}]
            },
        )

        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["batch_condition_id"], 7)
        self.assertEqual(row["condition_code"], "T1")
        self.assertEqual(row["features"]["anneal_stage1_seconds"], 600)
        self.assertEqual(row["metrics"]["pce"], 10.0)

        unmeasured = build_training_rows(conditions, device_metrics_by_condition={})
        self.assertIsNone(unmeasured[0]["metrics"])


class CampaignConfigTests(unittest.TestCase):
    """The BO space is configuration data: a second campaign config must
    drive the same search-space and extraction machinery without touching
    web_adapter code."""

    TINY_SPEC = [
        {"name": "valve", "kind": "choice", "choices": ["A", "B"]},
        {"name": "anneal_temperature_c", "kind": "int", "lower": 90, "upper": 150},
    ]
    TINY_MAPPING = [
        ["valve", "vcd_stages", 0, "valve"],
        ["anneal_temperature_c", "anneal_steps", 0, "temperature_c"],
    ]

    def test_seed_config_is_internally_consistent(self) -> None:
        config = BO_CONFIGS[DEFAULT_CAMPAIGN_ID]
        parameter_names = [entry["name"] for entry in config["parameters"]]
        mapping_names = [entry[0] for entry in config["feature_mapping"]]
        self.assertEqual(parameter_names, mapping_names)
        self.assertEqual(len(set(parameter_names)), len(parameter_names))
        space = search_space_for_campaign()
        self.assertEqual([parameter.name for parameter in space.parameters], parameter_names)
        self.assertEqual(list(search_space_parameter_names()), parameter_names)

    def test_seed_valve_choices_stay_within_the_builder_vocabulary(self) -> None:
        for entry in BO_CONFIGS[DEFAULT_CAMPAIGN_ID]["parameters"]:
            if entry["name"].endswith("_valve"):
                self.assertTrue(set(entry["choices"]).issubset(VCD_VALVES))

    def test_alternative_campaign_config_drives_extraction(self) -> None:
        space = search_space_from_spec(self.TINY_SPEC)
        self.assertEqual(
            [parameter.name for parameter in space.parameters],
            ["valve", "anneal_temperature_c"],
        )

        features = extract_condition_features(
            _snapshot(), feature_mapping=self.TINY_MAPPING
        )
        self.assertEqual(features, {"valve": "VV02", "anneal_temperature_c": 120})

        actual = extract_actual_process_features(
            {"annealing": {"anneal_steps": [{"temperature_c": 100, "seconds": 60}]}},
            feature_mapping=self.TINY_MAPPING,
        )
        self.assertEqual(actual, {"valve": None, "anneal_temperature_c": 100})

    def test_search_space_from_spec_rejects_malformed_entries(self) -> None:
        with self.assertRaises(ValueError):
            search_space_from_spec([{"name": "x", "kind": "bool"}])
        with self.assertRaises(ValueError):
            search_space_from_spec([{"name": "x", "kind": "int"}])
        with self.assertRaises(ValueError):
            search_space_from_spec([{"name": "x", "kind": "choice", "choices": []}])
        with self.assertRaises(ValueError):
            search_space_from_spec([{"name": "", "kind": "int", "lower": 0, "upper": 1}])

    def test_int_spec_rejects_non_integer_bounds_at_construction(self) -> None:
        # A float bound would make IntegerParameter.sample raise TypeError at
        # sampling time; construction must reject it instead.
        with self.assertRaises(ValueError):
            search_space_from_spec(
                [{"name": "x", "kind": "int", "lower": 0.5, "upper": 2.5}]
            )
        with self.assertRaises(ValueError):
            search_space_from_spec(
                [{"name": "x", "kind": "int", "lower": True, "upper": 2}]
            )

    def test_float_spec_rejects_nonfinite_bounds_at_construction(self) -> None:
        with self.assertRaises(ValueError):
            search_space_from_spec(
                [{"name": "x", "kind": "float", "lower": float("nan"), "upper": 1.0}]
            )
        with self.assertRaises(ValueError):
            search_space_from_spec(
                [{"name": "x", "kind": "float", "lower": 0.0, "upper": float("inf")}]
            )
        with self.assertRaises(ValueError):
            search_space_from_spec(
                [{"name": "x", "kind": "float", "lower": False, "upper": 1.0}]
            )

    def test_spec_numeric_bounds_success_cases(self) -> None:
        space = search_space_from_spec(
            [
                {"name": "i", "kind": "int", "lower": 1, "upper": 5},
                {"name": "f", "kind": "float", "lower": 0.5, "upper": 2},
                {"name": "c", "kind": "choice", "choices": ["a", "b"]},
            ]
        )
        by_name = {parameter.name: parameter for parameter in space.parameters}
        self.assertEqual((by_name["i"].lower, by_name["i"].upper), (1, 5))
        self.assertEqual((by_name["f"].lower, by_name["f"].upper), (0.5, 2))
        self.assertEqual(by_name["c"].choices, ["a", "b"])
        values = space.sample(Random(7))
        search_space = space
        search_space.validate(values)

    def test_unknown_campaign_raises_value_error(self) -> None:
        with self.assertRaises(ValueError):
            search_space_for_campaign("no_such_campaign")


if __name__ == "__main__":
    unittest.main()
