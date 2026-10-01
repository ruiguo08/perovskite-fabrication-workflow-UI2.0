"""Verify the selected browser suites obey the CI matrix's explicit opt-out."""

import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLASSES = {
    "tests.test_browser_builder_cdp": "BuilderCdpBrowserTests",
    "tests.test_browser_cutover": "CutoverBrowserTests",
    "tests.test_browser_results": "ResultBrowserTests",
    "tests.test_browser_run_sheet": "RunSheetBrowserTests",
}
PROBE = """
import importlib
import json
import sys
from pathlib import Path
from tests import test_browser_builder

test_browser_builder.CHROME_PATHS = (Path(sys.executable),) if sys.argv[1] == "1" else ()
classes = json.loads(sys.argv[2])
print(json.dumps({
    module: bool(getattr(getattr(importlib.import_module(module), name), "__unittest_skip__", False))
    for module, name in classes.items()
}))
"""


class BrowserSelectionPolicyTests(unittest.TestCase):
    def _selection(self, *, skip: bool, ci: bool, chrome: bool) -> dict[str, bool]:
        environment = os.environ.copy()
        environment["PEROVSKITE_SKIP_BROWSER"] = "1" if skip else "0"
        environment["PYTHONPATH"] = str(ROOT / "src")
        if ci:
            environment["CI"] = "true"
        else:
            environment.pop("CI", None)
        completed = subprocess.run(
            [sys.executable, "-c", PROBE, "1" if chrome else "0", json.dumps(CLASSES)],
            cwd=ROOT,
            env=environment,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        selection = json.loads(completed.stdout)
        self.assertEqual(set(selection), set(CLASSES))
        return selection

    def test_explicit_opt_out_skips_all_browser_classes_even_in_ci(self) -> None:
        for chrome in (False, True):
            with self.subTest(chrome=chrome):
                self.assertEqual(
                    self._selection(skip=True, ci=True, chrome=chrome),
                    dict.fromkeys(CLASSES, True),
                )

    def test_ci_opt_in_keeps_browser_classes_required_without_chrome(self) -> None:
        self.assertEqual(
            self._selection(skip=False, ci=True, chrome=False),
            dict.fromkeys(CLASSES, False),
        )

    def test_local_run_without_chrome_skips_browser_classes(self) -> None:
        self.assertEqual(
            self._selection(skip=False, ci=False, chrome=False),
            dict.fromkeys(CLASSES, True),
        )

    def test_available_chrome_runs_browser_classes_without_opt_out(self) -> None:
        for ci in (False, True):
            with self.subTest(ci=ci):
                self.assertEqual(
                    self._selection(skip=False, ci=ci, chrome=True),
                    dict.fromkeys(CLASSES, False),
                )
