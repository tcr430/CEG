import { SubmitButton } from "../../../components/submit-button";

export function ProspectForm({
  action,
  workspaceId,
  campaignId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  workspaceId: string;
  campaignId: string;
}) {
  return (
    <form action={action} className="panel prospectForm">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="campaignId" value={campaignId} />

      <div className="formGrid">
        <label className="field">
          <span>Company name</span>
          <input name="companyName" required />
        </label>

        <label className="field">
          <span>Website URL</span>
          <input name="companyWebsite" type="url" placeholder="https://example.com" />
        </label>
      </div>

      <div className="formGrid">
        <label className="field">
          <span>Contact name</span>
          <input name="contactName" />
        </label>

        <label className="field">
          <span>Contact email</span>
          <input name="email" type="email" />
        </label>
      </div>

      <label className="field">
        <span>Status</span>
        <select name="status" defaultValue="new">
          <option value="new">New</option>
          <option value="researched">Researched</option>
          <option value="sequenced">Sequenced</option>
          <option value="contacted">Contacted</option>
          <option value="replied">Replied</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </label>

      <div className="inlineActions">
        <SubmitButton className="buttonPrimary" pendingLabel="Adding prospect...">
          Add prospect
        </SubmitButton>
      </div>
    </form>
  );
}
