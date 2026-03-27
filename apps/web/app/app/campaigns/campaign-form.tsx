import type { Campaign, SenderProfile } from "@ceg/validation";

type CampaignFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  workspaceId: string;
  senderProfiles: SenderProfile[];
  submitLabel: string;
  campaign?: Campaign;
};

function joinLines(values: string[]) {
  return values.join("\n");
}

export function CampaignForm({
  action,
  workspaceId,
  senderProfiles,
  submitLabel,
  campaign,
}: CampaignFormProps) {
  return (
    <form action={action} className="panel senderProfileForm">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {campaign !== undefined ? (
        <input type="hidden" name="campaignId" value={campaign.id} />
      ) : null}

      <div className="formGrid">
        <label className="field">
          <span>Campaign name</span>
          <input name="name" defaultValue={campaign?.name ?? ""} required />
        </label>

        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={campaign?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span>Optional sender profile</span>
        <select
          name="senderProfileId"
          defaultValue={campaign?.senderProfileId ?? ""}
        >
          <option value="">Basic mode fallback</option>
          {senderProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        <small>
          Leave this unset to keep the campaign compatible with basic mode.
        </small>
      </label>

      <label className="field">
        <span>Offer summary</span>
        <textarea
          name="offerSummary"
          rows={4}
          defaultValue={campaign?.offerSummary ?? ""}
        />
      </label>

      <label className="field">
        <span>Target ICP</span>
        <textarea
          name="targetIcp"
          rows={3}
          defaultValue={campaign?.targetIcp ?? campaign?.targetPersona ?? ""}
        />
      </label>

      <div className="formGrid">
        <label className="field">
          <span>Target industries</span>
          <textarea
            name="targetIndustries"
            rows={5}
            defaultValue={campaign ? joinLines(campaign.targetIndustries) : ""}
          />
          <small>One industry per line.</small>
        </label>

        <label className="field">
          <span>Framework preferences</span>
          <textarea
            name="frameworkPreferences"
            rows={5}
            defaultValue={campaign ? joinLines(campaign.frameworkPreferences) : ""}
          />
          <small>One framework or prompting preference per line.</small>
        </label>
      </div>

      <div className="formGrid toneGrid">
        <label className="field">
          <span>Tone style</span>
          <input
            name="toneStyle"
            defaultValue={campaign?.tonePreferences.style ?? ""}
            placeholder="Sharp, consultative, executive"
          />
        </label>

        <label className="field">
          <span>Tone preferences: do</span>
          <textarea
            name="toneDo"
            rows={4}
            defaultValue={campaign ? joinLines(campaign.tonePreferences.do) : ""}
          />
        </label>

        <label className="field">
          <span>Tone preferences: avoid</span>
          <textarea
            name="toneAvoid"
            rows={4}
            defaultValue={campaign ? joinLines(campaign.tonePreferences.avoid) : ""}
          />
        </label>

        <label className="field">
          <span>Tone notes</span>
          <textarea
            name="toneNotes"
            rows={4}
            defaultValue={campaign?.tonePreferences.notes ?? ""}
          />
        </label>
      </div>

      <div className="inlineActions">
        <button type="submit" className="buttonPrimary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
