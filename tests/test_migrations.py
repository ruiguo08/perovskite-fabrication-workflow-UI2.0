import unittest
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory


class AlembicGraphTests(unittest.TestCase):
    def test_migrations_form_one_ordered_chain(self) -> None:
        root = Path(__file__).resolve().parents[1]
        config = Config(str(root / "alembic.ini"))
        script = ScriptDirectory.from_config(config)
        revisions = list(script.walk_revisions())

        self.assertEqual(script.get_heads(), ["0019_campaign_members"])
        self.assertEqual(
            [(revision.revision, revision.down_revision) for revision in revisions],
            [
                ("0019_campaign_members", "0018_password_self_service"),
                (
                    "0018_password_self_service",
                    "0017_equipment_booking",
                ),
                ("0017_equipment_booking", "0016_device_scan_stats"),
                (
                    "0016_device_scan_stats",
                    "0015_drop_experiments_recipe_blob",
                ),
                (
                    "0015_drop_experiments_recipe_blob",
                    "0014_deployment_integrity_repairs",
                ),
                ("0014_deployment_integrity_repairs", "0013_substrate_laser_marks"),
                ("0013_substrate_laser_marks", "0012_baseline_scope_owner"),
                ("0012_baseline_scope_owner", "0011_device_layout_versions"),
                ("0011_device_layout_versions", "0010_catalog_integrity"),
                ("0010_catalog_integrity", "0009_material_catalog"),
                ("0009_material_catalog", "0008_user_layer_presets"),
                ("0008_user_layer_presets", "0007_fabrication_batches"),
                ("0007_fabrication_batches", None),
            ],
        )

    def test_campaign_membership_schema_matches_the_frozen_contract(self) -> None:
        """Migration 0019 builds its table through the same frozen builder
        the runtime metadata uses, under the same naming convention."""

        import sqlalchemy as sa

        from web.campaign_schema_v1 import campaign_membership_table
        from web.database import (
            NAMING_CONVENTION,
            campaign_members,
            metadata,
        )

        migration_metadata = sa.MetaData(naming_convention=NAMING_CONVENTION)
        sa.Table("users", migration_metadata, sa.Column("id", sa.Integer, primary_key=True))
        sa.Table(
            "campaigns",
            migration_metadata,
            sa.Column("code", sa.String(160), primary_key=True),
        )
        frozen = campaign_membership_table(migration_metadata)

        def create_ddl(table: sa.Table) -> str:
            compiled = str(
                sa.schema.CreateTable(table).compile(dialect=sa.dialects.sqlite.dialect())
            )
            return " ".join(line.strip() for line in compiled.splitlines())

        self.assertEqual(create_ddl(frozen), create_ddl(campaign_members))
        self.assertIn("campaign_members", metadata.tables)
        primary = [column.name for column in frozen.primary_key.columns]
        self.assertEqual(primary, ["campaign_code", "user_id"])

    def test_password_token_schema_matches_the_frozen_contract(self) -> None:
        """Migration 0018 builds its table through the same frozen builder the
        runtime metadata uses, under the same naming convention — so Alembic
        and create_all emit identical DDL (the alembic-check baseline)."""

        import sqlalchemy as sa

        from web.account_schema_v1 import password_token_table
        from web.database import NAMING_CONVENTION, metadata, password_reset_tokens

        migration_metadata = sa.MetaData(naming_convention=NAMING_CONVENTION)
        sa.Table("users", migration_metadata, sa.Column("id", sa.Integer, primary_key=True))
        frozen = password_token_table(migration_metadata)

        def create_ddl(table: sa.Table) -> str:
            compiled = str(
                sa.schema.CreateTable(table).compile(dialect=sa.dialects.sqlite.dialect())
            )
            return " ".join(line.strip() for line in compiled.splitlines())

        self.assertEqual(create_ddl(frozen), create_ddl(password_reset_tokens))
        self.assertIn("password_reset_tokens", metadata.tables)

    def test_deviation_type_metadata_matches_the_integrity_contract(self) -> None:
        """The model metadata (the alembic-check baseline) carries the typed
        deviation contract: a non-null deviation_type with exact allowed
        values and a single-target check that includes condition_id."""

        from web.database import execution_deviations

        column = execution_deviations.c.deviation_type
        self.assertFalse(column.nullable)
        self.assertIsNone(column.server_default)

        checks = {
            # Constraint names carry the ck_<table>_ naming-convention prefix.
            str(constraint.name).split("_execution_deviations_")[-1]:
            constraint.sqltext.text
            for constraint in execution_deviations.constraints
            if constraint.__class__.__name__ == "CheckConstraint"
        }
        deviation_type_check = checks["valid_deviation_type"]
        for allowed in (
            "'general'",
            "'fabrication_shortfall'",
            "'measurement_shortfall'",
        ):
            self.assertIn(allowed, deviation_type_check)

        target_check = checks["at_most_one_deviation_target"]
        for target_column in (
            "solution_preparation_id",
            "process_execution_id",
            "substrate_id",
            "device_id",
            "condition_id",
        ):
            self.assertIn(target_column, target_check)


if __name__ == "__main__":
    unittest.main()
