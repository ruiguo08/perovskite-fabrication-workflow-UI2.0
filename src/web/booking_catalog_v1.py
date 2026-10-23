"""Frozen initial catalogue and v1 units, also used by migration 0017."""

DEFAULT_UNITS = {
    "glovebox": {"h2o": "ppm", "o2": "ppm", "temperature": "°C"},
    "ald": {"cycles": "cycle", "temperature": "°C", "pressure": "Pa"},
    "evaporation": {"thickness": "nm", "temperature": "°C", "pressure": "Pa"},
    "general": {},
}

CATALOG = [
    ("GB-1", "称量", "gloveboxes", "weighing", "GB-1", "glovebox"),
    ("GB-2", "配液", "gloveboxes", "solution", "GB-2", "glovebox"),
    ("GB-3", "旋涂（反溶剂）", "gloveboxes", "spin_coating", "GB-3", "glovebox"),
    ("GB-4", "旋涂（VCD）", "gloveboxes", "spin_coating", "GB-4", "glovebox"),
    ("GB-11", "旋涂（窄带隙）", "gloveboxes", "spin_coating", "GB-11", "glovebox"),
    ("GB-12", "旋涂（宽带隙）", "gloveboxes", "spin_coating", "GB-12", "glovebox"),
    ("GB-13", "自动旋涂", "gloveboxes", "spin_coating", "GB-13", "glovebox"),
    ("ALD", "ALD", "vacuum", "ald", "GB-7", "ald"),
    ("CVD", "CVD", "vacuum", "cvd", "standalone", "general"),
    ("TE-1", "热蒸发 1 · MBraun", "vacuum", "evaporation", "GB-8", "evaporation"),
    ("TE-2", "热蒸发 2 · 普迪", "vacuum", "evaporation", "GB-10", "evaporation"),
    ("SP-1", "磁控溅射", "vacuum", "sputtering", "GB-9", "general"),
    ("GB-5", "激光划线", "other", "laser", "GB-5", "glovebox"),
    ("GB-6", "光学·电池存储", "other", "storage", "GB-6", "glovebox"),
    ("SS-1", "常规", "characterization", "solar_simulator", "SS-1", "general"),
    ("SS-2", "叠层", "characterization", "solar_simulator", "SS-2", "general"),
    ("EQE-1", "EQE-1", "characterization", "eqe", "EQE-1", "general"),
    ("UV-1", "UV-1", "characterization", "uv", "UV-1", "general"),
    ("OP-1", "OP-1", "characterization", "optical", "OP-1", "general"),
    ("MPPT-1", "MPPT-1", "characterization", "mppt", "MPPT-1", "general"),
]
