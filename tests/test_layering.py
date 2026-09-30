"""Dependency-boundary tests for the application-operations layering.

The target architecture (see ARCHITECTURE.md "Module responsibilities"):

    HTTP routes (web.routes) -> application operations (web.operations)
        -> repository data functions (web.repository) -> web.database

These tests pin the import direction with AST scans so a violation fails in
CI instead of surviving as a silent architectural regression. Scans walk
every ``.py`` file under each layer package (subpackages included) and check
imports at any depth, so hiding an import inside a function body does not
bypass the boundary. In-function (lazy) imports of ``web.operations`` in the
repository are the one documented exception: they are allowed only in the
two deprecated delegate methods.
"""

import ast
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
WEB = SRC / "web"

sys.path.insert(0, str(SRC))


def _module_files(package: Path) -> list[Path]:
    return sorted(package.rglob("*.py"))


def _imports_at_module_level(tree: ast.Module) -> list[str]:
    """Full dotted names imported at module level (imports inside functions
    or classes are excluded)."""

    names = []
    for node in tree.body:
        if isinstance(node, ast.Import):
            names.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                names.extend(f"{node.module}.{a.name}" for a in node.names)
            else:
                names.extend(a.name for a in node.names)
    return names


class RepositoryToOperationsBoundaryTests(unittest.TestCase):
    """The repository depends on the database and domain records only; the
    application-operations layer calls into it, never the reverse (the two
    deprecated delegates call operations lazily inside their function bodies
    and are counted explicitly)."""

    def test_repository_never_imports_operations_at_module_level(self) -> None:
        offenders = []
        for path in _module_files(WEB / "repository"):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for name in _imports_at_module_level(tree):
                if ".operations" in name or name.startswith("operations"):
                    offenders.append(f"{path.name}: {name}")
        self.assertEqual(offenders, [])

    def test_lazy_operations_imports_are_limited_to_documented_delegates(self) -> None:
        allowed = {
            "result.py": "update_result_analysis_and_complete",
            "batch.py": "update_fabrication_batch_status",
        }
        for path in _module_files(WEB / "repository"):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            lazy = [
                node
                for node in ast.walk(tree)
                if isinstance(node, ast.ImportFrom)
                and node.module
                and "operations" in node.module
                and id(node) not in {id(n) for n in tree.body}
            ]
            if not lazy:
                continue
            self.assertIn(path.name, allowed, f"unexpected lazy import in {path.name}")
            # Every lazy operations import in the file must sit inside the
            # one documented delegate method.
            lazy_ids = {id(node) for node in lazy}
            containing_functions = [
                node
                for node in ast.walk(tree)
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                and any(id(child) in lazy_ids for child in ast.walk(node))
            ]
            self.assertEqual(
                len(containing_functions), len(lazy),
                f"lazy operations imports spread over multiple functions in {path.name}",
            )
            for function in containing_functions:
                self.assertEqual(function.name, allowed[path.name])


class ServicesToRepositoryBoundaryTests(unittest.TestCase):
    """The services layer must not import the repository package; shared
    low-level functionality (audit events) lives in web.audit_trail."""

    def test_services_never_import_repository_at_module_level(self) -> None:
        offenders = []
        for path in _module_files(WEB / "services"):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for name in _imports_at_module_level(tree):
                if name.startswith("repository") or ".repository" in name:
                    offenders.append(f"{path.name}: {name}")
        self.assertEqual(offenders, [])

    def test_services_do_not_lazily_import_repository(self) -> None:
        offenders = []
        for path in _module_files(WEB / "services"):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if (
                    isinstance(node, ast.ImportFrom)
                    and node.module
                    and "repository" in node.module
                ):
                    offenders.append(f"{path.name}: {node.module}")
        self.assertEqual(offenders, [])


class OperationsBoundaryTests(unittest.TestCase):
    """Application operations stay HTTP-free and never import the routes.

    Checked over the whole AST, at any nesting depth, and resistant to the
    obvious bypass shapes: aliased imports (``from fastapi.exceptions
    import HTTPException as H``), package-level imports
    (``from web import routes``), relative package imports
    (``from . import routes``), fastapi submodules and star imports, and
    indirect HTTPException references through any bound name or attribute.
    Docstring mentions still do not trip the check.
    """

    def _boundary_offenders(self, tree: ast.Module) -> list[str]:
        offenders: list[str] = []
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                module = node.module or ""
                relative_names = {
                    alias.name.split(".")[0] for alias in node.names
                }
                violates = (
                    "routes" in module
                    or module.startswith("fastapi")
                    or module == "web"
                    or (
                        node.module is None
                        and node.level > 0
                        and relative_names & {"routes", "fastapi"}
                    )
                    or (
                        module == "web"
                        and "routes" in relative_names
                    )
                )
                if violates:
                    offenders.append(
                        f"line {node.lineno}: imports from {module or '<relative>'}"
                    )
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    if "routes" in alias.name or alias.name.startswith("fastapi"):
                        offenders.append(
                            f"line {node.lineno}: imports {alias.name}"
                        )
            elif isinstance(node, (ast.Name, ast.Attribute)):
                name = node.id if isinstance(node, ast.Name) else node.attr
                if name == "HTTPException":
                    offenders.append(
                        f"line {node.lineno}: references HTTPException"
                    )
        return offenders

    def test_operations_never_import_routes_or_http(self) -> None:
        offenders: list[str] = []
        for path in _module_files(WEB / "operations"):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for offender in self._boundary_offenders(tree):
                offenders.append(f"{path.name}: {offender}")
        self.assertEqual(offenders, [])

    def test_adversarial_import_shapes_are_rejected(self) -> None:
        adversarial_sources = {
            "aliased fastapi submodule import": (
                "from fastapi.exceptions import HTTPException as H\n"
                "def op():\n    raise H(400)\n"
            ),
            "fastapi submodule star import": "from fastapi.exceptions import *\n",
            "fastapi submodule plain import": (
                "from fastapi.responses import JSONResponse\n"
            ),
            "package-level routes import with alias": (
                "from web import routes as r\n"
                "def op():\n    return r.helper()\n"
            ),
            "relative package-level routes import": (
                "from . import routes as r\n"
            ),
            "relative routes module import": "from ..routes import helper\n",
            "dotted absolute routes import": "import web.routes\n",
            "indirect HTTPException attribute": (
                "import fastapi\n"
                "def op():\n    raise fastapi.HTTPException(400)\n"
            ),
            "bare HTTPException raise": "def op(x):\n    return HTTPException(400)\n",
        }
        for label, source in adversarial_sources.items():
            with self.subTest(shape=label):
                offenders = self._boundary_offenders(ast.parse(source))
                self.assertTrue(offenders, f"bypass not caught: {label}")

    def test_docstring_and_unrelated_references_do_not_trip(self) -> None:
        safe_sources = {
            "docstring mentioning names": (
                '"""Maps errors; web.routes renders HTTPException bodies."""\n'
                "def op():\n"
                "    return 1\n"
            ),
            "web.repository import stays legal": (
                "from ..repository.records import UserRole\n"
            ),
            "core package import stays legal": (
                "from perovskite_bo.device_recipe import DeviceRecipe\n"
            ),
            "unrelated attribute named routes_ish": (
                "config.routes_count = 3\n"
            ),
        }
        for label, source in safe_sources.items():
            with self.subTest(shape=label):
                self.assertEqual(
                    self._boundary_offenders(ast.parse(source)), []
                )


class CorePackageBoundaryTests(unittest.TestCase):
    """perovskite_bo (the core science package) must not import web."""

    def test_core_never_imports_web(self) -> None:
        offenders = []
        core = SRC / "perovskite_bo"
        for path in _module_files(core):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for name in _imports_at_module_level(tree):
                if name == "web" or name.startswith("web."):
                    offenders.append(f"{path.name}: {name}")
        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()
