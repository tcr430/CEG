import type { SenderProfile } from "@ceg/validation";

import { SubmitButton } from "../../../components/submit-button";

type SenderProfileFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  workspaceId: string;
  submitLabel: string;
  profile?: SenderProfile;
  allowSenderAwareProfiles?: boolean;
  planLabel?: string;
};

function joinLines(values: string[]) {
  return values.join("\n");
}

export function SenderProfileForm({
  action,
  workspaceId,
  submitLabel,
  profile,
  allowSenderAwareProfiles = true,
  planLabel,
}: SenderProfileFormProps) {
  return (
    <form action={action} className="panel senderProfileForm">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {profile !== undefined ? (
        <input type="hidden" name="senderProfileId" value={profile.id} />
      ) : null}

      {!allowSenderAwareProfiles ? (
        <p className="statusMessage">
          {planLabel ?? "Current plan"} currently supports basic mode only. Sender-aware SDR,
          founder, and agency profiles unlock on a paid plan.
        </p>
      ) : null}

      <div className="formGrid">
        <label className="field">
          <span>Sender type</span>
          <select name="senderType" defaultValue={profile?.senderType ?? "basic"}>
            <option value="sdr" disabled={!allowSenderAwareProfiles}>SDR</option>
            <option value="saas_founder" disabled={!allowSenderAwareProfiles}>SaaS founder</option>
            <option value="agency" disabled={!allowSenderAwareProfiles}>Lead gen agency</option>
            <option value="basic">Basic mode fallback</option>
          </select>
        </label>

        <label className="field">
          <span>Profile name</span>
          <input name="name" defaultValue={profile?.name ?? ""} required />
        </label>

        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={profile?.status ?? "active"}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="field checkboxField">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={profile?.isDefault ?? false}
          />
          <span>Use as default sender profile for this workspace</span>
        </label>
      </div>

      <label className="field">
        <span>Company name</span>
        <input name="companyName" defaultValue={profile?.companyName ?? ""} />
      </label>

      <label className="field">
        <span>Product or service description</span>
        <textarea
          name="productDescription"
          rows={4}
          defaultValue={profile?.productDescription ?? ""}
        />
      </label>

      <label className="field">
        <span>Target customer</span>
        <textarea
          name="targetCustomer"
          rows={3}
          defaultValue={profile?.targetCustomer ?? ""}
        />
      </label>

      <label className="field">
        <span>Value proposition</span>
        <textarea
          name="valueProposition"
          rows={4}
          defaultValue={profile?.valueProposition ?? ""}
        />
      </label>

      <label className="field">
        <span>Differentiation</span>
        <textarea
          name="differentiation"
          rows={4}
          defaultValue={profile?.differentiation ?? ""}
        />
      </label>

      <div className="formGrid">
        <label className="field">
          <span>Proof points</span>
          <textarea
            name="proofPoints"
            rows={5}
            defaultValue={profile ? joinLines(profile.proofPoints) : ""}
          />
          <small>One proof point per line.</small>
        </label>

        <label className="field">
          <span>Goals</span>
          <textarea
            name="goals"
            rows={5}
            defaultValue={profile ? joinLines(profile.goals) : ""}
          />
          <small>One goal per line.</small>
        </label>
      </div>

      <div className="formGrid toneGrid">
        <label className="field">
          <span>Tone style</span>
          <input
            name="toneStyle"
            defaultValue={profile?.tonePreferences.style ?? ""}
            placeholder="Direct, consultative, measured"
          />
        </label>

        <label className="field">
          <span>Tone preferences: do</span>
          <textarea
            name="toneDo"
            rows={4}
            defaultValue={profile ? joinLines(profile.tonePreferences.do) : ""}
          />
        </label>

        <label className="field">
          <span>Tone preferences: avoid</span>
          <textarea
            name="toneAvoid"
            rows={4}
            defaultValue={profile ? joinLines(profile.tonePreferences.avoid) : ""}
          />
        </label>

        <label className="field">
          <span>Tone notes</span>
          <textarea
            name="toneNotes"
            rows={4}
            defaultValue={profile?.tonePreferences.notes ?? ""}
          />
        </label>
      </div>

      <div className="inlineActions">
        <SubmitButton className="buttonPrimary" pendingLabel="Saving sender profile...">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
