import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useEffect, useState } from "react";

type FigureKind = "jv" | "boxplot" | "uniformity";
type Metric = "voc" | "jsc" | "ff" | "pce";
export type FigureColorScale = { minimum?: number; maximum?: number; threshold?: number };

function figureUrl(
  resultId: number,
  kind: FigureKind,
  format: "svg" | "pdf" | "tiff",
  metric?: Metric,
  direction?: "forward" | "reverse",
  deviceIds: string[] = [],
  excludedDeviceIds?: string[],
  flaggedDeviceIds: string[] = [],
  revision?: number,
  download = false,
  palette?: string,
  scale?: FigureColorScale,
) {
  const params = new URLSearchParams({ format });
  if (metric) params.set("metric", metric);
  if (kind === "uniformity" && direction) params.set("direction", direction);
  if (palette) params.set("palette", palette);
  if (kind === "uniformity" && scale) {
    if (scale.minimum !== undefined) params.set("scale_min", String(scale.minimum));
    if (scale.maximum !== undefined) params.set("scale_max", String(scale.maximum));
    if (scale.threshold !== undefined) params.set("threshold", String(scale.threshold));
  }
  for (const deviceId of deviceIds) params.append("device_id", deviceId);
  if (excludedDeviceIds !== undefined) {
    params.set("preview_exclusions", "true");
    for (const deviceId of [...excludedDeviceIds].sort()) {
      params.append("excluded_device_id", deviceId);
    }
  }
  if (kind === "uniformity") {
    for (const deviceId of [...flaggedDeviceIds].sort()) params.append("flagged_device_id", deviceId);
  }
  if (revision !== undefined) params.set("revision", String(revision));
  if (download) params.set("download", "true");
  return `/api/results/${resultId}/figures/${kind}?${params.toString()}`;
}

export function PublicationFigure({
  resultId,
  kind,
  metric,
  direction,
  deviceIds = [],
  excludedDeviceIds,
  flaggedDeviceIds = [],
  revision,
  alt,
  palette,
  scale,
  downloadEnabled = true,
}: {
  resultId: number;
  kind: FigureKind;
  metric?: Metric;
  direction?: "forward" | "reverse";
  deviceIds?: string[];
  excludedDeviceIds?: string[];
  flaggedDeviceIds?: string[];
  revision?: number;
  alt: string;
  palette?: string;
  scale?: FigureColorScale;
  downloadEnabled?: boolean;
}) {
  useUiLanguage();
  const [error, setError] = useState(false);
  const src = figureUrl(resultId, kind, "svg", metric, direction, deviceIds, excludedDeviceIds, flaggedDeviceIds, revision, false, palette, scale);
  useEffect(() => setError(false), [src]);
  return <figure className="publication-figure">
    <div className="publication-figure__downloads" aria-label={tr("publicationFigure.publicationFigureDownloads")}>
      <span>{tr("publicationFigure.download")}</span>
      {(["svg", "pdf", "tiff"] as const).map((format) =>
        downloadEnabled
          ? <a key={format} className="button button--secondary button--small"
              href={figureUrl(resultId, kind, format, metric, direction, deviceIds, excludedDeviceIds, flaggedDeviceIds, revision, true, palette, scale)} download>
              {format.toUpperCase()}
            </a>
          : <button key={format} className="button button--secondary button--small" type="button" disabled
              title={tr("publicationFigure.saveExclusionChangesBeforeDownloadingTheFilteredFigure")}>
              {format.toUpperCase()}
            </button>)}
    </div>
    {error
      ? <p role="alert">{tr("publicationFigure.thePublicationFigureCouldNotBeGeneratedForThis")}</p>
      : <img key={src} src={src} alt={alt} role="img" aria-label={alt} onError={() => setError(true)} />}
    <figcaption>{tr("publicationFigure.pythonMatplotlibPreviewTheDownloadedSVGPDFAndTIFF")}</figcaption>
  </figure>;
}
