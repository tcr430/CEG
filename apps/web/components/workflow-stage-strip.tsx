import type { VisibleWorkflowStage } from "../lib/workflow-visibility";

type WorkflowStageStripProps = {
  label: string;
  title: string;
  description?: string;
  stages: VisibleWorkflowStage[];
  nextActionLabel?: string;
  nextActionTitle?: string;
  nextActionNote?: string;
};

export function WorkflowStageStrip({
  label,
  title,
  description,
  stages,
  nextActionLabel,
  nextActionTitle,
  nextActionNote,
}: WorkflowStageStripProps) {
  return (
    <section className="dashboardCard workflowStageCard">
      <div className="threadTimelineHeader">
        <div>
          <p className="cardLabel">{label}</p>
          <h2>{title}</h2>
        </div>
        {nextActionTitle ? <span className="pill">{nextActionTitle}</span> : null}
      </div>
      {description ? <p>{description}</p> : null}
      {nextActionLabel && nextActionNote ? (
        <p className="statusMessage workflowStageHint">
          {nextActionLabel}: {nextActionNote}
        </p>
      ) : null}
      <div className="workflowStageGrid">
        {stages.map((stage, index) => (
          <div key={stage.key} className={`workflowStageItem workflowStageItem-${stage.status}`}>
            <div className="workflowStageHeader">
              <span className="workflowStageIndex">{index + 1}</span>
              <strong>{stage.label}</strong>
            </div>
            <p>{stage.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
