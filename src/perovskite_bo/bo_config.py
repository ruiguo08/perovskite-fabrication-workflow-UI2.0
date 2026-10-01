"""Per-campaign Bayesian-optimization configuration as plain data.

The search space, its mapping onto the stored condition snapshots, and the
campaign it belongs to are configuration, not code: adapting BO to another
campaign or instrument means supplying different data (today a dict in this
module, later a database row), not editing the extraction logic in
:mod:`perovskite_bo.web_adapter`.

Every parameter spec is a JSON-able dict —
``{"name": str, "kind": "int", "lower": int, "upper": int}``,
``{"name": str, "kind": "float", "lower": float, "upper": float}``, or
``{"name": str, "kind": "choice", "choices": [value, ...]}`` — and every
feature-mapping entry is a ``[parameter_name, process_container,
step_index, field_name]`` list locating one parameter inside a stored
``deposition_process`` snapshot (``spin_steps`` / ``vcd_stages`` /
``gas_backfill_stages`` / ``anneal_steps``).
"""

from typing import Any

DEFAULT_CAMPAIGN_ID = "usual_v1"

# VCD pressures use integer Pa so laboratory setpoints such as 150 Pa are
# representable without duplicating a differently scaled mbar field. The
# valve choices are the usual_v1 campaign's physical evacuation-line valves;
# they must remain a subset of perovskite_bo.device_recipe.VCD_VALVES.
BO_CONFIGS: dict[str, dict[str, Any]] = {
    "usual_v1": {
        "campaign": "usual_v1",
        "description": (
            "Deposition-only space: a 3-step spin coat, a 3-stage VCD "
            "program, and the first anneal stage. All other recipe data is "
            "campaign-fixed."
        ),
        "parameters": [
            {"name": "spin_cast_rpm", "kind": "int", "lower": 500, "upper": 1_000},
            {"name": "spin_cast_seconds", "kind": "int", "lower": 60, "upper": 60},
            {
                "name": "spin_cast_acceleration_rpm_per_s",
                "kind": "int",
                "lower": 100,
                "upper": 1_000,
            },
            {"name": "spin_spread_rpm", "kind": "int", "lower": 1_000, "upper": 3_000},
            {"name": "spin_spread_seconds", "kind": "int", "lower": 5, "upper": 20},
            {
                "name": "spin_spread_acceleration_rpm_per_s",
                "kind": "int",
                "lower": 100,
                "upper": 2_000,
            },
            {"name": "spin_thin_rpm", "kind": "int", "lower": 3_000, "upper": 6_000},
            {"name": "spin_thin_seconds", "kind": "int", "lower": 10, "upper": 40},
            {
                "name": "spin_thin_acceleration_rpm_per_s",
                "kind": "int",
                "lower": 100,
                "upper": 3_000,
            },
            {
                "name": "vcd_stage1_valve",
                "kind": "choice",
                "choices": ["VV02", "VV03", "VV06"],
            },
            {
                "name": "vcd_stage1_pressure_pa",
                "kind": "int",
                "lower": 1,
                "upper": 1_000,
            },
            {"name": "vcd_stage1_seconds", "kind": "int", "lower": 5, "upper": 60},
            {
                "name": "vcd_stage2_valve",
                "kind": "choice",
                "choices": ["VV02", "VV03", "VV06"],
            },
            {
                "name": "vcd_stage2_pressure_pa",
                "kind": "int",
                "lower": 1,
                "upper": 1_000,
            },
            {"name": "vcd_stage2_seconds", "kind": "int", "lower": 5, "upper": 60},
            {
                "name": "vcd_stage3_valve",
                "kind": "choice",
                "choices": ["VV02", "VV03", "VV06"],
            },
            {
                "name": "vcd_stage3_pressure_pa",
                "kind": "int",
                "lower": 1,
                "upper": 1_000,
            },
            {"name": "vcd_stage3_seconds", "kind": "int", "lower": 5, "upper": 60},
            {
                "name": "anneal_stage1_temperature_c",
                "kind": "int",
                "lower": 90,
                "upper": 150,
            },
            {
                "name": "anneal_stage1_seconds",
                "kind": "int",
                "lower": 300,
                "upper": 1_800,
            },
        ],
        "feature_mapping": [
            ["spin_cast_rpm", "spin_steps", 0, "rpm"],
            ["spin_cast_seconds", "spin_steps", 0, "seconds"],
            ["spin_cast_acceleration_rpm_per_s", "spin_steps", 0, "acceleration_rpm_per_s"],
            ["spin_spread_rpm", "spin_steps", 1, "rpm"],
            ["spin_spread_seconds", "spin_steps", 1, "seconds"],
            ["spin_spread_acceleration_rpm_per_s", "spin_steps", 1, "acceleration_rpm_per_s"],
            ["spin_thin_rpm", "spin_steps", 2, "rpm"],
            ["spin_thin_seconds", "spin_steps", 2, "seconds"],
            ["spin_thin_acceleration_rpm_per_s", "spin_steps", 2, "acceleration_rpm_per_s"],
            ["vcd_stage1_valve", "vcd_stages", 0, "valve"],
            ["vcd_stage1_pressure_pa", "vcd_stages", 0, "pressure_pa"],
            ["vcd_stage1_seconds", "vcd_stages", 0, "seconds"],
            ["vcd_stage2_valve", "vcd_stages", 1, "valve"],
            ["vcd_stage2_pressure_pa", "vcd_stages", 1, "pressure_pa"],
            ["vcd_stage2_seconds", "vcd_stages", 1, "seconds"],
            ["vcd_stage3_valve", "vcd_stages", 2, "valve"],
            ["vcd_stage3_pressure_pa", "vcd_stages", 2, "pressure_pa"],
            ["vcd_stage3_seconds", "vcd_stages", 2, "seconds"],
            ["anneal_stage1_temperature_c", "anneal_steps", 0, "temperature_c"],
            ["anneal_stage1_seconds", "anneal_steps", 0, "seconds"],
        ],
    },
}
