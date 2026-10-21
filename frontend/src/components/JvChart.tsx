import { useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useState } from "react";
import type { AnalysisDevice, ResultAssignmentGroup } from "../types/api";
import { formatNumber, scaleMetric } from "../lib/format";
import { directionalMetric } from "../lib/deviceMetrics";
import { DeviceMultiSelect } from "./DeviceMultiSelect";
import { PublicationFigure } from "./PublicationFigure";

const MAX_PLOTTED_DEVICES = 12;
const JV_PALETTES = [
  ["standalone", "Standalone J–V (orange / teal)"],
  ["nature-classic", "Nature Classic"],
  ["science-tol", "Science / Paul Tol"],
  ["lancet-clinical", "Lancet Clinical"],
  ["nejm", "NEJM Palette"],
] as const;

export function JvChart({ resultId, devices, groups, figureRevision }: {
  resultId: number;
  devices: AnalysisDevice[];
  groups: ResultAssignmentGroup[];
  figureRevision?: number;
}) {
  useUiLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [plotted, setPlotted] = useState<string[]>([]);
  const [palette, setPalette] = useState("standalone");
  const groupNames = useMemo(() => new Map(groups.map((group) => [group.group_id, group.name])), [groups]);

  function applySelection(next: Set<string>) {
    setSelected(next);
    setPlotted([]);
  }
  function selectAll() {
    applySelection(new Set(devices.map((device) => device.device_id)));
  }
  function clearAll() {
    applySelection(new Set());
  }
  function plotSelected() {
    setPlotted(Array.from(selected).slice(0, MAX_PLOTTED_DEVICES));
  }
  const allSelected = devices.length > 0 && selected.size === devices.length;
  return <section className="panel" aria-labelledby="jv-chart-title">
    <div className="panel__heading">
      <h2 className="panel__title" id="jv-chart-title">{tr("jvChart.publicationJVCurves")}</h2>
      <div className="button-row">
        <button type="button" className="button button--secondary button--small" onClick={selectAll}>{tr("jvChart.selectAll")}</button>
        <button type="button" className="button button--secondary button--small" onClick={plotSelected} disabled={!selected.size}>{tr("jvChart.plotSelected")}</button>
        <button type="button" className="button button--secondary button--small" onClick={clearAll}>{tr("jvChart.clear")}</button>
        <span className="run-sheet-muted">{selected.size} {tr("jvChart.selected")}{allSelected ? tr("jvChart.all") : ""}</span>
      </div>
    </div>
    <label>{tr("jvChart.colorPalette")}<select className="text-input" value={palette}
      onChange={(event) => setPalette(event.target.value)}>
      {JV_PALETTES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <DeviceMultiSelect devices={devices} selected={selected} onChange={applySelection} />
    {selected.size > MAX_PLOTTED_DEVICES && <p className="run-sheet-muted" role="status">
      {tr("jvChart.theFirst")}{MAX_PLOTTED_DEVICES} {tr("jvChart.selectedDevicesWillBePlotted")}</p>}
    <p className="run-sheet-muted">
      {plotted.length
        ? tr("jvChart.nSelectedDeviceSShownClearToReturnTo", { "n": plotted.length, "s": plotted.length === 1 ? "" : "s" })
        : tr("jvChart.showingEveryDeviceByGroupSelectDevicesAndChoose")}
    </p>
    <PublicationFigure resultId={resultId} kind="jv" deviceIds={plotted} revision={figureRevision} palette={palette}
      alt={plotted.length ? tr("jvChart.publicationJVCurvesForIds", { "ids": plotted.join(", ") }) : tr("jvChart.allDeviceJVCurvesByGroup")} />
    <details className="result-inline-details">
      <summary>{tr("jvChart.deviceMetrics")}<span>{devices.length} {tr("jvChart.devices")}</span></summary>
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr><th>{tr("jvChart.select")}</th><th>{tr("deviceExclusionsPanel.device")}</th><th>{tr("deviceExclusionsPanel.substrate")}</th><th>{tr("deviceExclusionsPanel.group")}</th><th>{tr("jvChart.scan")}</th><th>{tr("jvChart.validScans")}</th><th>Voc</th><th>Jsc</th><th>FF</th><th>PCE</th></tr></thead>
        <tbody>{devices.flatMap((device) => (["forward", "reverse"] as const).map((direction) => <tr key={`${device.device_id}-${direction}`}>
          <td>{direction === "forward" ? <input type="checkbox" aria-label={tr("jvChart.selectDeviceId", { "device_id": device.device_id })} checked={selected.has(device.device_id)}
            value={device.device_id}
            onChange={(event) => {
              const next = new Set(selected);
              if (event.target.checked) next.add(device.device_id); else next.delete(device.device_id);
              applySelection(next);
            }} /> : null}</td>
          <td>{device.device_id}{device.excluded && <span className="status-badge status-badge--danger">{tr("jvChart.excluded")}</span>}</td>
          <td>{device.substrate_id}</td><td>{groupNames.get(device.group_id) ?? tr("deviceExclusionsPanel.unassigned")}</td>
          <td>{direction === "forward" ? tr("deviceScanHistoryPanel.forward") : tr("deviceScanHistoryPanel.reverse")}</td>
          <td>{device.traces.filter((trace) => trace.valid && trace.direction === direction).length}</td>
          <td>{formatNumber(directionalMetric(device.metrics, direction, "voc"), 3)}</td>
          <td>{formatNumber(directionalMetric(device.metrics, direction, "jsc"), 2)}</td>
          <td>{formatNumber(scaleMetric("ff", directionalMetric(device.metrics, direction, "ff")), 2)}</td>
          <td>{formatNumber(directionalMetric(device.metrics, direction, "pce"), 2)}</td>
        </tr>))}</tbody>
      </table>
    </div>
    </details>
  </section>;
}
