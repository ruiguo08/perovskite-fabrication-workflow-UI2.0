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
    """Call only in legacy fabrication-account fixtures after POST /api/users."""
    if response.status_code == 201:
        client.portal.call(grant_user, client.app.state.database, response.json()["id"])
