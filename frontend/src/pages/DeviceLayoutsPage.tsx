import { localizeAppText } from "../i18n";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useCallback, useState, type FormEvent } from "react";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FormField } from "../components/FormField";
import { InlineFormError } from "../components/InlineFormError";
import { PageHeader } from "../components/PageHeader";
import { useSession } from "../auth/session";
import { useToast } from "../components/Toast";
import { apiFetch } from "../lib/api";
import { useApiResource } from "../lib/useApiResource";
import type { DeviceLayout } from "../types/api";

const COLUMNS: Column<DeviceLayout>[] = [
  {
    key: "code",
    get header() { return tr("conditionCard.layout"); },
    render: (row) => <code>{row.code}</code>,
  },
  {
    key: "dimensions",
    get header() { return tr("deviceExclusionsPanel.substrate"); },
    render: (row) => `${row.substrate_width_mm} × ${row.substrate_length_mm} mm`,
  },
  {
    key: "devices_per_substrate",
    get header() { return tr("conditionCard.devices"); },
    className: "numeric-cell",
  },
  {
    key: "device_active_area_cm2",
    get header() { return tr("deviceLayoutsPage.areaDevice"); },
    className: "numeric-cell",
    render: (row) => `${row.device_active_area_cm2} cm²`,
  },
  {
    key: "total_active_area_cm2",
    get header() { return tr("deviceLayoutsPage.totalActiveArea"); },
    className: "numeric-cell",
    render: (row) => `${row.total_active_area_cm2} cm²`,
  },
  {
    key: "version",
    get header() { return tr("deviceLayoutsPage.version"); },
    render: (row) => <span className="version-mark">v{row.version}</span>,
  },
];

interface LayoutFormState {
  code: string;
  version: string;
  substrate_width_mm: string;
  substrate_length_mm: string;
  devices_per_substrate: string;
  device_active_area_cm2: string;
  total_active_area_cm2: string;
  description: string;
}

const EMPTY_FORM: LayoutFormState = {
  code: "",
  version: "1",
  substrate_width_mm: "",
  substrate_length_mm: "",
  devices_per_substrate: "1",
  device_active_area_cm2: "",
  total_active_area_cm2: "",
  description: "",
};

export function DeviceLayoutsPage() {
  useUiLanguage();
  const { user } = useSession();
  const { show } = useToast();
  const isAdmin = user?.role === "administrator";
  const loadLayouts = useCallback(
    () => apiFetch<DeviceLayout[]>("/api/device-layouts"),
    [],
  );
  const resource = useApiResource(loadLayouts);
  const [form, setForm] = useState<LayoutFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const rows = resource.data ?? [];

  async function createLayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<DeviceLayout>("/api/device-layouts", {
        method: "POST",
        body: {
          code: form.code.trim(),
          version: Number(form.version),
          substrate_width_mm: form.substrate_width_mm,
          substrate_length_mm: form.substrate_length_mm,
          devices_per_substrate: Number(form.devices_per_substrate),
          device_active_area_cm2: form.device_active_area_cm2,
          total_active_area_cm2: form.total_active_area_cm2,
          description: form.description.trim(),
        },
      });
      show(`Device layout ${created.code} v${created.version} created.`, "success");
      setForm(EMPTY_FORM);
      await resource.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the device layout.");
    } finally {
      setSubmitting(false);
    }
  }

  if (resource.status === "loading" && resource.data === null) {
    return <div className="page-loading" role="status">{tr("deviceLayoutsPage.loadingDeviceLayouts")}</div>;
  }
  if (resource.status === "error" && resource.data === null) {
    return <ErrorState message={resource.error ?? tr("deviceLayoutsPage.unableToLoadDeviceLayouts")} action={
      <button type="button" className="button button--secondary" onClick={() => void resource.reload()}>{tr("versionHistory.retry")}</button>
    } />;
  }

  return (
    <>
      <PageHeader
        title={tr("deviceLayoutsPage.deviceLayouts")}
        description={tr("deviceLayoutsPage.versionedSubstrateGeometryUsedToCalculatePhysicalDevicesAnd")}
        meta={isAdmin ? "Administrator-managed catalog" : "Read-only reference catalog"}
      />
      {isAdmin ? (
        <section className="panel panel--accent" aria-labelledby="create-layout-title">
          <h2 className="panel__title" id="create-layout-title">{tr("deviceLayoutsPage.createADeviceLayout")}</h2>
          <p className="builder-help">
            {tr("deviceLayoutsPage.layoutRowsAreImmutableToChangeAGeometryCreate")}</p>
          <form
            className="preset-create-grid"
            onSubmit={(event) => void createLayout(event)}
          >
            <FormField label={tr("batchDetailPage.code")} htmlFor="layout-code" required hint={tr("deviceLayoutsPage.shortStableIdentifierEGXDual")}>
              <input id="layout-code" className="text-input" required maxLength={40} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </FormField>
            <FormField label={tr("deviceLayoutsPage.version")} htmlFor="layout-version" required>
              <input id="layout-version" className="text-input" required type="number" min="1" step="1" value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} />
            </FormField>
            <FormField label={tr("deviceLayoutsPage.substrateWidthMm")} htmlFor="layout-width" required>
              <input id="layout-width" className="text-input" required type="number" min="0" step="any" value={form.substrate_width_mm} onChange={(event) => setForm({ ...form, substrate_width_mm: event.target.value })} />
            </FormField>
            <FormField label={tr("deviceLayoutsPage.substrateLengthMm")} htmlFor="layout-length" required>
              <input id="layout-length" className="text-input" required type="number" min="0" step="any" value={form.substrate_length_mm} onChange={(event) => setForm({ ...form, substrate_length_mm: event.target.value })} />
            </FormField>
            <FormField label={tr("substratePanel.devicesPerSubstrate")} htmlFor="layout-devices" required>
              <input id="layout-devices" className="text-input" required type="number" min="1" step="1" value={form.devices_per_substrate} onChange={(event) => setForm({ ...form, devices_per_substrate: event.target.value })} />
            </FormField>
            <FormField label={tr("deviceLayoutsPage.activeAreaPerDeviceCm")} htmlFor="layout-area" required>
              <input id="layout-area" className="text-input" required type="number" min="0" step="any" value={form.device_active_area_cm2} onChange={(event) => setForm({ ...form, device_active_area_cm2: event.target.value })} />
            </FormField>
            <FormField label={tr("deviceLayoutsPage.totalActiveAreaCm")} htmlFor="layout-total" required>
              <input id="layout-total" className="text-input" required type="number" min="0" step="any" value={form.total_active_area_cm2} onChange={(event) => setForm({ ...form, total_active_area_cm2: event.target.value })} />
            </FormField>
            <FormField label={tr("deviationSection.description")} htmlFor="layout-description" required>
              <input id="layout-description" className="text-input" required maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </FormField>
            <div className="form-grid__action">
              <button className="button button--primary" type="submit" disabled={submitting}>
                {submitting ? tr("blankPresetForm.creating") : tr("deviceLayoutsPage.createLayout")}
              </button>
            </div>
          </form>
          <InlineFormError message={localizeAppText(error ?? "")} />
        </section>
      ) : null}
      <section className="panel panel--catalog">
        <DataTable
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => `${row.code}:${row.version}`}
          ariaLabel={tr("deviceLayoutsPage.deviceLayoutDirectory")}
          loading={resource.status === "loading"}
          empty={isAdmin
            ? <EmptyState title={tr("deviceLayoutsPage.noDeviceLayoutsExistYet")} description={tr("deviceLayoutsPage.studentsCannotPlanExperimentsUntilYouCreateTheFirst")} />
            : <EmptyState title={tr("deviceLayoutsPage.noDeviceLayoutsAreAvailable")} description={tr("deviceLayoutsPage.askYourAdministratorToCreateTheDeviceLayouts")} />}
        />
      </section>
    </>
  );
}
