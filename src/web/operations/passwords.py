"""Account password self-service: one-time links and authenticated changes.

Invariants kept by this module: only a SHA-256 hash of a link token is ever
stored; issuing a link never disturbs existing credentials or sessions; a
link is consumed inside the same transaction that writes the new password
hash and wipes sessions, so a token can never outlive the credentials that
redeemed it; and no password, raw token, or link URL reaches audit details.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import delete, insert, select, update

from ..audit_trail import add_audit_event, utc_now
from ..auth import (
    PASSWORD_LINK_TTL_MINUTES,
    authenticate_credentials,
    hash_password_async,
    hash_token,
)
from ..database import password_reset_tokens, sessions, users


def new_link_values(now: datetime) -> tuple[str, str, datetime]:
    """token_urlsafe(32) carries 256 bits of cryptographic randomness."""
    token = secrets.token_urlsafe(32)
    return token, hash_token(token), now + timedelta(minutes=PASSWORD_LINK_TTL_MINUTES)


def reset_path(token: str) -> str:
    """App-internal path that carries the secret in the URL fragment.

    Fragments are never transmitted to the server, so the token stays out of
    request paths, access logs, and backend-visible referrer values.
    """
    return f"/app/set-password#token={token}"


async def issue_reset_link(
    repository: Any,
    user_id: int,
    actor_id: int,
    client_ip: str | None,
) -> dict[str, Any]:
    """(Re-)issue the one-time password link for an active account.

    Re-issuing replaces any previous token. Existing credentials and sessions
    are only revoked when the link is redeemed, not when it is generated.
    """
    now = utc_now()
    token, token_hash, expires_at = new_link_values(now)
    async with repository.database.begin() as connection:
        # The row lock serializes concurrent issuance and keeps the token
        # write ordered against deactivation and password replacements.
        account = (
            await connection.execute(
                update(users)
                .where(users.c.id == user_id, users.c.is_active.is_(True))
                .values(updated_at=now)
                .returning(users.c.id)
            )
        ).first()
        if account is None:
            raise KeyError("active account not found")
        await connection.execute(
            delete(password_reset_tokens).where(
                password_reset_tokens.c.user_id == user_id
            )
        )
        await connection.execute(
            insert(password_reset_tokens).values(
                user_id=user_id,
                token_hash=token_hash,
                issued_at=now,
                expires_at=expires_at,
            )
        )
        await add_audit_event(
            connection,
            actor_user_id=actor_id,
            action="user.password_link",
            entity_type="user",
            entity_id=str(user_id),
            details={},
            client_ip=client_ip,
        )
    return {"url": reset_path(token), "expires_at": expires_at.isoformat()}


async def change_password(
    repository: Any,
    settings: Any,
    auth: Any,
    current_password: str,
    new_password: str,
    client_ip: str | None,
) -> None:
    """Change the caller's own password after verifying the current one.

    authenticate_credentials applies the same lockout and throttle policy as
    the login endpoint, so guessing a current password through this endpoint
    is no easier than guessing it at the sign-in screen.
    """
    verified = await authenticate_credentials(
        repository, settings, username=auth.user.username, password=current_password
    )
    if verified is None:
        raise PermissionError(
            "Current password is incorrect or the account is locked."
        )
    encoded = await hash_password_async(new_password, username=verified.username)
    await replace_password(
        repository, verified.id, encoded, client_ip,
        expected_hash=verified.password_hash,
    )


async def redeem_password_link(
    repository: Any,
    token: str,
    password: str,
    client_ip: str | None,
) -> None:
    """Set a new password by consuming a one-time link.

    The read below only decides whether the expensive password hashing is
    worth doing; the authoritative claim happens in replace_password under
    the account lock inside the write transaction.
    """
    async with repository.database.engine.connect() as connection:
        account = (
            await connection.execute(
                select(users.c.id, users.c.username)
                .join(
                    password_reset_tokens,
                    password_reset_tokens.c.user_id == users.c.id,
                )
                .where(
                    password_reset_tokens.c.token_hash == hash_token(token),
                    password_reset_tokens.c.expires_at > utc_now(),
                    users.c.is_active.is_(True),
                )
            )
        ).first()
    if account is None:
        raise PermissionError("This password link is invalid or expired.")
    encoded = await hash_password_async(password, username=account.username)
    await replace_password(repository, account.id, encoded, client_ip, token=token)


async def replace_password(
    repository: Any,
    user_id: int,
    encoded: str,
    client_ip: str | None,
    *,
    expected_hash: str | None = None,
    token: str | None = None,
) -> None:
    """Write the new hash, consume the link if present, and wipe sessions.

    One transaction serializes on the account row (the first UPDATE) before
    any token or session write, so a concurrent administrator reset, account
    deactivation, or second redemption either commits first and fails the
    predicate here, or runs after this commit and observes the new state.
    """
    async with repository.database.begin() as connection:
        predicate = [users.c.id == user_id, users.c.is_active.is_(True)]
        if expected_hash is not None:
            # A concurrent reset replaced the hash between verification and
            # this write; the caller must start over with fresh credentials.
            predicate.append(users.c.password_hash == expected_hash)
        account = (
            await connection.execute(
                update(users)
                .where(*predicate)
                .values(updated_at=utc_now())
                .returning(users.c.id)
            )
        ).first()
        if account is None:
            raise PermissionError(
                "Account credentials changed. Please sign in again."
            )
        # Expiry is judged only after the lock is held: a token that lapses
        # while this transaction waited on the account row must not be
        # accepted, and timestamps reflect the actual write time.
        now = utc_now()
        if token is not None:
            claimed = await connection.execute(
                delete(password_reset_tokens).where(
                    password_reset_tokens.c.user_id == user_id,
                    password_reset_tokens.c.token_hash == hash_token(token),
                    password_reset_tokens.c.expires_at > now,
                )
            )
            if claimed.rowcount != 1:
                raise PermissionError("This password link is invalid or expired.")
        await connection.execute(
            update(users)
            .where(users.c.id == user_id)
            .values(
                password_hash=encoded,
                password_changed_at=now,
                updated_at=now,
                failed_login_count=0,
                locked_until=None,
            )
        )
        await connection.execute(
            delete(sessions).where(sessions.c.user_id == user_id)
        )
        await connection.execute(
            delete(password_reset_tokens).where(
                password_reset_tokens.c.user_id == user_id
            )
        )
        await add_audit_event(
            connection,
            actor_user_id=user_id,
            action="user.recover_password" if token else "user.change_password",
            entity_type="user",
            entity_id=str(user_id),
            details={},
            client_ip=client_ip,
        )
