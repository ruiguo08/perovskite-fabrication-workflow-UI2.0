"""Explicit grants for legacy synthetic workflow fixtures, never app defaults."""

from sqlalchemy import insert

from web.audit_trail import utc_now
from web.database import BOOKING_TABLES


async def grant_user(database, user_id):
    from sqlalchemy import select

    table = BOOKING_TABLES["workflow_access"]
    async with database.begin() as connection:
        if (
            await connection.scalar(select(table.c.user_id).where(table.c.user_id == user_id))
            is None
        ):
            await connection.execute(
                insert(table).values(
                    user_id=user_id,
                    granted_at=utc_now(),
                    source="administrator",
                )
            )


def grant_created_workflow_user(client, response):
    """Call only in legacy fabrication-account fixtures after POST /api/users.

    Grants fabrication workflow access and, for the legacy single-campaign
    fixtures, a membership of the bootstrap campaign: manager for staff
    accounts (their historical review rights), participant for students
    (their historical create-and-own rights)."""
    from tests.campaign_access_fixtures import grant_campaign_member
    from web.app import DEFAULT_EXPERIMENT_SERIES_ID

    if response.status_code == 201:
        user_id = response.json()["id"]
        client.portal.call(grant_user, client.app.state.database, user_id)
        membership_role = (
            "participant" if response.json()["role"] == "student" else "manager"
        )
        grant_campaign_member(
            client, DEFAULT_EXPERIMENT_SERIES_ID, user_id, membership_role
        )
