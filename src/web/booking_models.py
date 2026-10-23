"""Strict booking commands and immutable v1 usage-template contracts."""

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import (
    AwareDatetime,
    ConfigDict,
    Field,
    StrictBool,
    StrictInt,
    TypeAdapter,
    field_validator,
    model_validator,
)

from .booking_catalog_v1 import DEFAULT_UNITS
from .models import ApiModel

TextValue = Annotated[str, Field(min_length=1, max_length=4000)]
Number = Annotated[float, Field(strict=True, allow_inf_nan=False)]
Nonnegative = Annotated[Number, Field(ge=0)]
Template = Literal["glovebox", "ald", "evaporation", "general"]


class BookingModel(ApiModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @field_validator(
        "starts_at",
        "ends_at",
        "valid_from",
        "valid_until",
        "notify_until",
        mode="before",
        check_fields=False,
    )
    @classmethod
    def iso_datetime(cls, value):
        if value is None or isinstance(value, datetime):
            return value
        if not isinstance(value, str):
            raise ValueError("timestamps must use ISO 8601 with a timezone")
        # Reject numeric epoch strings that Pydantic would otherwise accept.
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError("timestamps require a timezone")
        return value

    @field_validator(
        "starts_at",
        "ends_at",
        "valid_from",
        "valid_until",
        "notify_until",
        mode="after",
        check_fields=False,
    )
    @classmethod
    def utc_datetime(cls, value):
        # SQLite's DateTime adapter drops offsets instead of converting them.
        # Normalize before persistence so both databases store the same instant.
        return as_utc(value) if value is not None else None


class Interval(BookingModel):
    starts_at: AwareDatetime
    ends_at: AwareDatetime

    @model_validator(mode="after")
    def ordered(self) -> "Interval":
        if self.ends_at <= self.starts_at:
            raise ValueError("end must be after start")
        return self


class ReservationCreate(Interval):
    equipment_id: int = Field(gt=0)
    kind: Literal["booking", "maintenance"] = "booking"
    reason: str = Field(default="", max_length=4000)
    request_key: str = Field(min_length=8, max_length=80)


class ReservationAction(BookingModel):
    action: Literal["cancel", "start", "end", "submit_and_end", "no_show", "release", "force_end"]
    reason: str = Field(default="", max_length=4000)
    fields: dict[str, Any] | None = None
    notes: str | None = Field(default=None, max_length=4000)


class UsageUpdate(BookingModel):
    fields: dict[str, Any]
    notes: str = Field(default="", max_length=4000)
    submit: StrictBool = False


class GloveboxFields(BookingModel):
    before_h2o: Nonnegative
    after_h2o: Nonnegative
    before_o2: Nonnegative
    after_o2: Nonnegative
    before_temperature: Number
    after_temperature: Number


class AldFields(BookingModel):
    material: TextValue
    cycles: Annotated[StrictInt, Field(gt=0)]
    initial_temperature: Number
    chamber_pressure: Nonnegative


class Film(BookingModel):
    material: TextValue
    thickness: Nonnegative


class EvaporationFields(BookingModel):
    layers: list[Film] = Field(min_length=1, max_length=100)
    vacuum: Nonnegative
    initial_temperature: Number


class GeneralFields(BookingModel):
    usage: TextValue


FIELD_MODELS = {
    "glovebox": GloveboxFields,
    "ald": AldFields,
    "evaporation": EvaporationFields,
    "general": GeneralFields,
}


def validate_units(template: str, units: dict[str, str]) -> dict[str, str]:
    expected = DEFAULT_UNITS[template]
    if units.keys() != expected.keys():
        raise ValueError("unit keys must match the template")
    allowed = {"pressure": {"Pa", "mbar", "Torr"}, "thickness": {"nm", "Å"}}
    if any(value not in allowed.get(key, {expected[key]}) for key, value in units.items()):
        raise ValueError("unsupported unit")
    return units


def validate_fields(template: str, version: int, fields: dict, *, submit: bool) -> dict:
    if version != 1 or template not in FIELD_MODELS:
        raise ValueError("unsupported usage template version")
    model = FIELD_MODELS[template]
    if submit:
        return model.model_validate(fields).model_dump(mode="json")
    # Validate each supplied field using the complete model's field definitions;
    # drafts may omit fields, but never accept unknown keys or invalid values.
    result = {}
    for key, value in fields.items():
        if key not in model.model_fields:
            raise ValueError(f"unknown usage field: {key}")
        field = model.model_fields[key]
        adapter = TypeAdapter(Annotated[field.annotation, *field.metadata])
        result[key] = adapter.dump_python(adapter.validate_python(value), mode="json")
    return result


class EquipmentUpdate(BookingModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    group_code: str | None = Field(default=None, min_length=1, max_length=40)
    equipment_type: str | None = Field(default=None, min_length=1, max_length=40)
    location: str | None = Field(default=None, min_length=1, max_length=80)
    manager_id: int | None = Field(default=None, gt=0)
    bookable: StrictBool | None = None
    template: Template | None = None
    units: dict[str, str] | None = None

    @model_validator(mode="after")
    def nonnull(self) -> "EquipmentUpdate":
        for key in self.model_fields_set - {"manager_id"}:
            if getattr(self, key) is None:
                raise ValueError(f"{key} cannot be null")
        return self


class NoticeCreate(BookingModel):
    equipment_id: int = Field(gt=0)
    body: TextValue
    pinned: StrictBool = False
    valid_from: AwareDatetime
    valid_until: AwareDatetime
    notify_until: AwareDatetime | None = None
    request_key: str = Field(min_length=8, max_length=80)

    @model_validator(mode="after")
    def ordered(self) -> "NoticeCreate":
        if self.valid_until <= self.valid_from:
            raise ValueError("notice expiry must be after start")
        return self


class NoticeUpdate(BookingModel):
    pinned: StrictBool | None = None
    withdraw: StrictBool = False


class AccessUpdate(BookingModel):
    enabled: StrictBool


def as_utc(value: datetime) -> datetime:
    from datetime import timezone

    return (
        value.replace(tzinfo=timezone.utc)
        if value.tzinfo is None
        else value.astimezone(timezone.utc)
    )


class EquipmentResponse(ApiModel):
    id: int
    code: str
    name: str
    group_code: str
    equipment_type: str
    location: str
    manager_id: int | None
    bookable: bool
    template: Template
    template_version: int
    units: dict[str, str]
    description: str
    updated_at: datetime


class ReservationResponse(ApiModel):
    id: int
    equipment_id: int
    user_id: int
    kind: Literal["booking", "maintenance"]
    status: Literal["planned", "in_use", "completed", "cancelled", "no_show", "blocked", "released"]
    starts_at: datetime
    ends_at: datetime
    actual_start: datetime | None
    actual_end: datetime | None
    reason: str
    request_key: str
    created_at: datetime
    updated_at: datetime
    updated_by_id: int


class CalendarRow(ApiModel):
    id: int
    equipment_id: int
    code: str
    user_id: int
    reserved_by: str
    kind: str
    status: str
    starts_at: datetime
    ends_at: datetime
    actual_start: datetime | None
    actual_end: datetime | None


class UsageResponse(ApiModel):
    id: int
    reservation_id: int
    template: Template
    template_version: int
    units: dict[str, str]
    fields: dict[str, Any]
    notes: str
    status: Literal["draft", "submitted"]
    submitted_at: datetime | None
    updated_at: datetime
    updated_by_id: int


class LedgerRow(UsageResponse):
    equipment_id: int
    user_id: int
    reservation_status: str
    actual_start: datetime | None
    actual_end: datetime | None


class NoticeResponse(ApiModel):
    id: int
    equipment_id: int
    body: str
    pinned: bool
    valid_from: datetime
    valid_until: datetime
    notify_until: datetime | None
    withdrawn_at: datetime | None
    created_by_id: int
    updated_by_id: int
    created_at: datetime
    updated_at: datetime
    request_key: str


class NotificationResponse(ApiModel):
    id: int
    recipient_id: int
    reservation_id: int | None
    notice_id: int | None
    event: Literal["reservation_cancelled", "equipment_notice"]
    created_at: datetime
    read_at: datetime | None
    dedup_key: str


class AccessResponse(ApiModel):
    user_id: int
    workflow_access: bool


class AccessGrantResponse(ApiModel):
    user_id: int
    granted_by_id: int | None
    granted_at: datetime
    revoked_by_id: int | None
    revoked_at: datetime | None
    source: Literal["migration", "administrator"]
