"""Path-resolution coverage for the relocated visualization scripts.

The four standalone scripts moved from the repository root into
``scripts/viz/``; their default inputs and outputs must still resolve
against the repository root, not the script location."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = REPO_ROOT / "scripts" / "viz"


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class VizScriptPathTests(unittest.TestCase):
    def test_matplotlib_scripts_resolve_repo_root(self) -> None:
        for name in ("jv_curve", "metric_boxplot", "substrate_uniformity_map"):
            with self.subTest(script=name):
                module = _load_module(name, SCRIPTS / f"{name}.py")
                self.assertEqual(module.ROOT, REPO_ROOT)
                out: Path = module.OUT
                self.assertEqual(out, REPO_ROOT / "docs" / "test-data" / "viz-mockups")

    def test_mockup_script_declares_repo_root_paths(self) -> None:
        # viz_mockups loads its (gitignored) real-data CSV at module scope,
        # so it cannot be imported without that file; assert the path
        # bootstrap from the source instead.
        source = (SCRIPTS / "viz_mockups.py").read_text(encoding="utf-8")
        self.assertIn("ROOT = Path(__file__).resolve().parents[2]", source)
        self.assertIn('sys.path.insert(0, str(ROOT / "src"))', source)
        self.assertIn('RAW = ROOT / "docs/test-data/20260916.csv"', source)
        self.assertIn('OUT = ROOT / "docs/test-data/viz-mockups"', source)

    def test_scripts_live_in_the_relocated_directory(self) -> None:
        for name in ("jv_curve.py", "metric_boxplot.py",
                     "substrate_uniformity_map.py", "viz_mockups.py"):
            self.assertTrue((SCRIPTS / name).is_file(), name)
            self.assertFalse((REPO_ROOT / name).exists(), name)


if __name__ == "__main__":
    unittest.main()
