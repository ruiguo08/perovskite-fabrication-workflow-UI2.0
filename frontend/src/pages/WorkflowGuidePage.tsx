import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import workflowPreview from "../assets/user-workflow-sop.svg";
import workflowPreviewZh from "../assets/user-workflow-sop-zh.svg";

export function WorkflowGuidePage() {
  const { language } = useUiLanguage();
  const preview = language === "zh" ? workflowPreviewZh : workflowPreview;
  const [diagramOpen, setDiagramOpen] = useState(false);
  return (
    <div className="workflow-guide">
      <PageHeader
        title={tr("workflowGuidePage.workflowGuide")}
        description={tr("workflowGuidePage.aShortPathFromAnExperimentPlanToJ")}
        actions={<Link className="button button--primary" to="/experiments/new">{tr("workflowGuidePage.startAnExperiment")}</Link>}
      />

      <section className="workflow-guide__setup" aria-labelledby="workflow-setup-title">
        <div>
          <span className="workflow-guide__eyebrow">{tr("workflowGuidePage.beforeYouBegin")}</span>
          <h2 id="workflow-setup-title">{tr("workflowGuidePage.prepareTheExperimentContext")}</h2>
          <p>{tr("workflowGuidePage.anActiveCampaignAndADeviceLayoutAreRequired")}</p>
        </div>
        <div className="workflow-guide__setup-links">
          <Link to="/campaigns">{tr("overviewPage.viewCampaigns")}</Link>
          <Link to="/device-layouts">{tr("workflowGuidePage.viewDeviceLayouts")}</Link>
        </div>
      </section>

      <section className="workflow-guide__overview" aria-labelledby="workflow-map-title">
        <div className="workflow-guide__section-heading">
          <div>
            <span className="workflow-guide__eyebrow">{tr("workflowGuidePage.processMap")}</span>
            <h2 id="workflow-map-title">{tr("workflowGuidePage.theFullPathAtAGlance")}</h2>
          </div>
          <button type="button" className="button button--link" onClick={() => setDiagramOpen(true)}>{tr("workflowGuidePage.enlargeDiagram")}</button>
        </div>
        <figure className="workflow-guide__figure">
          <img
            src={preview}
            alt={tr("workflowGuidePage.archifyWorkflowCreateAndSubmitAnExperimentObtainInstructor")}
            width="1112"
            height="660"
            decoding="async"
          />
          <figcaption>{tr("workflowGuidePage.staticOverviewUseTheLinkedStepsBelowToContinue")}</figcaption>
        </figure>
        <Dialog open={diagramOpen} onClose={() => setDiagramOpen(false)} fullWidth maxWidth="xl" aria-labelledby="workflow-diagram-title">
          <DialogTitle id="workflow-diagram-title">{tr("workflowGuidePage.theFullPathAtAGlance")}</DialogTitle>
          <DialogContent>
            <img className="workflow-guide__diagram-image" src={preview} alt={tr("workflowGuidePage.archifyWorkflowCreateAndSubmitAnExperimentObtainInstructor")} width="1112" height="660" />
          </DialogContent>
          <DialogActions>
            <button type="button" className="button button--secondary" onClick={() => setDiagramOpen(false)}>{tr("common.close")}</button>
          </DialogActions>
        </Dialog>
      </section>

      <section aria-labelledby="workflow-steps-title">
        <div className="workflow-guide__section-heading">
          <div>
            <span className="workflow-guide__eyebrow">{tr("workflowGuidePage.workingSOP")}</span>
            <h2 id="workflow-steps-title">{tr("workflowGuidePage.followTheseSteps")}</h2>
          </div>
        </div>
        <ol className="workflow-guide__steps">
          <li className="workflow-guide__step">
            <span className="workflow-guide__number" aria-hidden="true">01</span>
            <div className="workflow-guide__step-body">
              <span className="workflow-guide__phase">{tr("workflowGuidePage.planStudent")}</span>
              <h3>{tr("workflowGuidePage.createAndSubmitAPlan")}</h3>
              <p>{tr("workflowGuidePage.chooseTheCampaignAndDeviceLayoutDefineAControl")}<strong>{tr("experimentDetailPage.submitForApproval")}</strong>.</p>
              <Link className="workflow-guide__action" to="/experiments/new">{tr("workflowGuidePage.createExperiment")}<span aria-hidden="true">→</span></Link>
            </div>
          </li>
          <li className="workflow-guide__step">
            <span className="workflow-guide__number" aria-hidden="true">02</span>
            <div className="workflow-guide__step-body">
              <span className="workflow-guide__phase">{tr("workflowGuidePage.reviewInstructorThenStudent")}</span>
              <h3>{tr("workflowGuidePage.approveAndReleaseThePlan")}</h3>
              <p>{tr("workflowGuidePage.anInstructorOrAdministratorReviewsTheConditionsAndSelects")}<strong>{tr("experimentDetailPage.approvePlan")}</strong>{tr("workflowGuidePage.theStudentThenOpensTheApprovedExperimentAndSelects")}<strong>{tr("experimentDetailPage.releaseApprovedPlan")}</strong>.</p>
              <Link className="workflow-guide__action" to="/experiments">{tr("workflowGuidePage.findTheExperiment")}<span aria-hidden="true">→</span></Link>
            </div>
          </li>
          <li className="workflow-guide__step">
            <span className="workflow-guide__number" aria-hidden="true">03</span>
            <div className="workflow-guide__step-body">
              <span className="workflow-guide__phase">{tr("workflowGuidePage.fabricateStudent")}</span>
              <h3>{tr("workflowGuidePage.freezeABatchAndRecordTheWork")}</h3>
              <p>{tr("workflowGuidePage.onTheExperimentPageSelect")}<strong>{tr("experimentDetailPage.freezeFabricationBatch")}</strong> {tr("workflowGuidePage.before")}<strong>{tr("experimentDetailPage.startFabrication")}</strong>{tr("workflowGuidePage.inTheBatchRunSheetMarkItReadyStart")}</p>
              <Link className="workflow-guide__action" to="/fabrication-batches">{tr("common.openBatches")} <span aria-hidden="true">→</span></Link>
            </div>
          </li>
          <li className="workflow-guide__step">
            <span className="workflow-guide__number" aria-hidden="true">04</span>
            <div className="workflow-guide__step-body">
              <span className="workflow-guide__phase">{tr("workflowGuidePage.characterizeStudent")}</span>
              <h3>{tr("workflowGuidePage.uploadTheJVCSV")}</h3>
              <p>{tr("workflowGuidePage.openTheExperimentAposS")}<strong>{tr("experimentDetailPage.characterizationResults")}</strong> {tr("workflowGuidePage.sectionAndSelect")}<strong>{tr("experimentDetailPage.uploadResults")}</strong>{tr("workflowGuidePage.chooseTheBatchThatProducedTheDevicesUploadIts")}</p>
              <Link className="workflow-guide__action" to="/experiments">{tr("workflowGuidePage.chooseAnExperiment")}<span aria-hidden="true">→</span></Link>
            </div>
          </li>
          <li className="workflow-guide__step workflow-guide__step--analysis">
            <span className="workflow-guide__number" aria-hidden="true">05</span>
            <div className="workflow-guide__step-body">
              <span className="workflow-guide__phase">{tr("workflowGuidePage.analyzeResultPage")}</span>
              <h3>{tr("workflowGuidePage.inspectCurvesThenCompareGroups")}</h3>
              <p>{tr("workflowGuidePage.jVCurvesAreAvailableImmediatelyAfterUploadAssign")}</p>
              <Link className="workflow-guide__action" to="/results">{tr("common.openResults")} <span aria-hidden="true">→</span></Link>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}
