"""Explicit campaign-membership fixtures for access tests, never app defaults."""

from sqlalchemy import insert, select

from web.audit_trail import utc_now
from web.database import campaign_members


async def grant_membership(
    database, campaign_code: str, user_id: int, role: str
) -> None:
    """Grant (or re-activate) one membership directly, as an administrator
    would through the API in production."""
    async with database.begin() as connection:
        existing = await connection.scalar(
            select(campaign_members.c.campaign_code).where(
                campaign_members.c.campaign_code == campaign_code,
                campaign_members.c.user_id == user_id,
            )
        )
        if existing is None:
            await connection.execute(
                insert(campaign_members).values(
                    campaign_code=campaign_code,
                    user_id=user_id,
                    role=role,
                    granted_at=utc_now(),
                    revoked_at=None,
                )
            )


def grant_campaign_member(
    client, campaign_code: str, user_id: int, role: str
) -> None:
    """Grant a campaign membership through the running test app."""
    client.portal.call(
        grant_membership, client.app.state.database, campaign_code, user_id, role
    )


def grant_created_campaign_member(
    client, campaign_code: str, response, role: str = "participant"
) -> None:
    """Grant a campaign membership to the user of a POST /api/users response."""
    if response.status_code == 201:
        grant_campaign_member(client, campaign_code, response.json()["id"], role)
