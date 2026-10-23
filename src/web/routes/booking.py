"""Authenticated booking API, intentionally outside the fabrication router."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.routing import APIRoute
from pydantic import AwareDatetime

from ..auth import AuthContext, require_csrf, require_user
from ..booking_models import (
    AccessGrantResponse,
    AccessResponse,
    AccessUpdate,
    CalendarRow,
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
    Interval,
    LedgerRow,
    NoticeCreate,
    NoticeResponse,
    NoticeUpdate,
    NotificationResponse,
    ReservationAction,
    ReservationCreate,
    ReservationResponse,
    UsageResponse,
    UsageUpdate,
)
from ..operations.booking import BookingOperations
from ..operations.errors import AccessDenied, InvalidInput, RecordNotFound, StateConflict


class BookingRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()

        async def handler(request):
            try:
                return await original(request)
            except AccessDenied as error:
                raise HTTPException(403, str(error)) from None
            except RecordNotFound as error:
                raise HTTPException(404, str(error)) from None
            except StateConflict as error:
                raise HTTPException(409, str(error)) from None
            except (InvalidInput, ValueError) as error:
                raise HTTPException(422, str(error)) from None

        return handler


def operations(
    request: Request, auth: Annotated[AuthContext, Depends(require_user)]
) -> BookingOperations:
    return BookingOperations(
        request.app.state.database, auth.user.id, request.client.host if request.client else None
    )


Ops = Annotated[BookingOperations, Depends(operations)]
Offset = Annotated[int, Query(ge=0, le=1000000)]


def create_booking_router() -> APIRouter:
    router = APIRouter(
        prefix="/api/booking",
        tags=["booking"],
        dependencies=[Depends(require_user)],
        route_class=BookingRoute,
    )
    write = [Depends(require_csrf)]

    @router.get("/equipment", response_model=list[EquipmentResponse])
    async def list_equipment(op: Ops):
        return await op.list_equipment()

    @router.post(
        "/equipment",
        status_code=201,
        dependencies=write,
        response_model=EquipmentResponse,
    )
    async def create_equipment(payload: EquipmentCreate, op: Ops):
        return await op.create_equipment(payload)

    @router.patch("/equipment/{equipment_id}", dependencies=write, response_model=EquipmentResponse)
    async def update_equipment(equipment_id: int, payload: EquipmentUpdate, op: Ops):
        return await op.update_equipment(equipment_id, payload)

    @router.get("/reservations", response_model=list[CalendarRow])
    async def calendar(
        op: Ops,
        starts_at: AwareDatetime,
        ends_at: AwareDatetime,
        equipment_id: int | None = None,
        history: bool = False,
        offset: Offset = 0,
    ):
        return await op.calendar(starts_at, ends_at, equipment_id, history, offset)

    @router.post(
        "/reservations", status_code=201, dependencies=write, response_model=ReservationResponse
    )
    async def create_reservation(payload: ReservationCreate, op: Ops):
        return await op.create_reservation(payload)

    @router.get("/reservations/{reservation_id}", response_model=ReservationResponse)
    async def reservation_detail(reservation_id: int, op: Ops):
        return await op.reservation_detail(reservation_id)

    @router.patch(
        "/reservations/{reservation_id}/time",
        dependencies=write,
        response_model=ReservationResponse,
    )
    async def reschedule(reservation_id: int, payload: Interval, op: Ops):
        return await op.reschedule(reservation_id, payload)

    @router.post(
        "/reservations/{reservation_id}/actions",
        dependencies=write,
        response_model=ReservationResponse,
    )
    async def action(reservation_id: int, payload: ReservationAction, op: Ops):
        return await op.action(reservation_id, payload)

    @router.get("/reservations/{reservation_id}/usage", response_model=UsageResponse | None)
    async def get_usage(reservation_id: int, op: Ops):
        return await op.get_usage(reservation_id)

    @router.put(
        "/reservations/{reservation_id}/usage", dependencies=write, response_model=UsageResponse
    )
    async def update_usage(reservation_id: int, payload: UsageUpdate, op: Ops):
        return await op.update_usage(reservation_id, payload)

    @router.get("/ledger", response_model=list[LedgerRow])
    async def ledger(
        op: Ops, equipment_id: int | None = None, pending: bool = False, offset: Offset = 0
    ):
        return await op.ledger(equipment_id, pending, offset)

    @router.get("/notices", response_model=list[NoticeResponse])
    async def notices(
        op: Ops, equipment_id: int | None = None, offset: Offset = 0, history: bool = False
    ):
        return await op.list_notices(equipment_id, offset, history)

    @router.get("/notices/{notice_id}", response_model=NoticeResponse)
    async def notice_detail(notice_id: int, op: Ops):
        return await op.notice_detail(notice_id)

    @router.post("/notices", status_code=201, dependencies=write, response_model=NoticeResponse)
    async def create_notice(payload: NoticeCreate, op: Ops):
        return await op.create_notice(payload)

    @router.patch("/notices/{notice_id}", dependencies=write, response_model=NoticeResponse)
    async def update_notice(notice_id: int, payload: NoticeUpdate, op: Ops):
        return await op.update_notice(notice_id, payload)

    @router.get("/notifications", response_model=list[NotificationResponse])
    async def notifications(op: Ops, offset: Offset = 0):
        return await op.notifications(offset=offset)

    @router.post(
        "/notifications/{notification_id}/read",
        dependencies=write,
        response_model=NotificationResponse,
    )
    async def read_notification(notification_id: int, op: Ops):
        return await op.notifications(notification_id)

    @router.get("/workflow-access", response_model=list[AccessGrantResponse])
    async def list_access(op: Ops, offset: Offset = 0):
        return await op.list_access(offset)

    @router.put("/workflow-access/{user_id}", dependencies=write, response_model=AccessResponse)
    async def set_access(user_id: int, payload: AccessUpdate, op: Ops):
        return await op.set_access(user_id, payload.enabled)

    return router
