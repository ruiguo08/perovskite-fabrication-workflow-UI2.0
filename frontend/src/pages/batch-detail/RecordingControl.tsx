import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import type { ReactNode } from "react";

interface RecordingControlProps {
  value: string;
  editor: ReactNode;
  onChange: (value: string) => void;
}

export function RecordingControl({ value, editor, onChange }: RecordingControlProps) {
  useUiLanguage();
  return (
    <div className="run-sheet-recording">
      <label className="form-field">
        <span className="form-field__label">{tr("recordingControl.actualRecording")}</span>
        <select
          className="text-input"
          data-actual-mode="true"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{tr("recordingControl.notRecordedYet")}</option>
          <option value="copied_from_plan">{tr("recordingControl.recordedAsPlanned")}</option>
          <option value="entered">{tr("recordingControl.recordAdjustedParameters")}</option>
        </select>
      </label>
      {value === "entered" && editor}
    </div>
  );
}
