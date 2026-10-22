export type Template = "glovebox" | "ald" | "evaporation" | "general";
export type BookingStatus =
  | "planned"
  | "in_use"
  | "completed"
  | "cancelled"
  | "no_show"
  | "blocked"
  | "released";
export interface Equipment {
  id: number;
  code: string;
  name: string;
  group_code: string;
  equipment_type: string;
  location: string;
  manager_id: number | null;
  bookable: boolean;
  template: Template;
  template_version: number;
  units: Record<string, string>;
  description: string;
}
export interface CalendarRow {
  id: number;
  equipment_id: number;
  code: string;
  user_id: number;
  reserved_by: string;
  kind: "booking" | "maintenance";
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  actual_start: string | null;
  actual_end: string | null;
}
export interface Reservation extends Omit<CalendarRow, "code" | "reserved_by"> {
  reason: string;
}
export interface Usage {
  id: number;
  reservation_id: number;
  template: Template;
  template_version: number;
  units: Record<string, string>;
  fields: Record<string, unknown>;
  notes: string;
  status: "draft" | "submitted";
  submitted_at: string | null;
  updated_at: string;
  updated_by_id: number;
}
export interface LedgerRow extends Usage {
  equipment_id: number;
  user_id: number;
  reservation_status: BookingStatus;
  actual_start: string | null;
  actual_end: string | null;
}
export interface Notice {
  id: number;
  equipment_id: number;
  body: string;
  pinned: boolean;
  valid_from: string;
  valid_until: string;
  withdrawn_at: string | null;
}
export interface Notification {
  id: number;
  event: "reservation_cancelled" | "equipment_notice";
  reservation_id: number | null;
  notice_id: number | null;
  created_at: string;
  read_at: string | null;
}
