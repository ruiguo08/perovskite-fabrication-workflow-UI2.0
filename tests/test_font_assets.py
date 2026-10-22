"""Production font assets must work under font-src self, in every subset."""

import re
import unittest
from pathlib import Path

from web.app import STATIC_APP_DIR


class FontAssetTests(unittest.TestCase):
    def test_all_font_subsets_are_external_and_packaged(self) -> None:
        stylesheets = list((STATIC_APP_DIR / "assets").glob("*.css"))
        self.assertTrue(stylesheets, "production CSS is missing")
        font_count = 0
        for stylesheet in stylesheets:
            css = stylesheet.read_text(encoding="utf-8")
            for face in re.findall(r"@font-face\s*\{([^}]+)\}", css):
                sources = re.findall(r"url\(([^)]+)\)", face)
                self.assertTrue(sources, "font face is missing its source")
                for source in sources:
                    url = source.strip("\"'")
                    with self.subTest(stylesheet=stylesheet.name, font=font_count):
                        self.assertFalse(url.startswith("data:"), "inline font blocked by font-src self")
                        self.assertNotIn(":", url, "font must be self-hosted")
                        self.assertFalse(url.startswith("//"), "font must be same-origin")
                        if url.startswith("/app/"):
                            path = STATIC_APP_DIR / url.removeprefix("/app/")
                        else:
                            path = stylesheet.parent / url
                        self.assertEqual(Path(url).suffix, ".woff2")
                        self.assertTrue(path.is_file(), "font asset missing from bundle")
                    font_count += 1
        self.assertGreater(font_count, 0, "no font subsets were checked")
