import { PageLoading } from "../../components/page-loading";

export function DashboardLoadingState() {
  return (
    <PageLoading
      eyebrow="Dashboard"
      title="Loading workspace overview"
      description="Pulling the current workspace, onboarding state, and launch path shortcuts into view."
      columns={2}
      cardCount={5}
    />
  );
}

export function CampaignListLoadingState() {
  return (
    <PageLoading
      eyebrow="Campaigns"
      title="Loading campaign list"
      description="Preparing workspace campaigns and the next best actions for this account."
      cardCount={4}
    />
  );
}

export function CampaignDetailLoadingState() {
  return (
    <PageLoading
      eyebrow="Campaign"
      title="Loading campaign detail"
      description="Bringing the brief, sender context, and current prospect list into one place."
      columns={2}
      cardCount={4}
    />
  );
}

export function ProspectDetailLoadingState() {
  return (
    <PageLoading
      eyebrow="Prospect"
      title="Loading prospect workspace"
      description="Preparing research, sequence, thread, and reply state for the current prospect."
      columns={2}
      cardCount={6}
      lines={4}
    />
  );
}

export function SettingsLoadingState() {
  return (
    <PageLoading
      eyebrow="Settings"
      title="Loading workspace settings"
      description="Resolving billing, team access, inbox state, and operational controls."
      columns={2}
      cardCount={6}
      lines={4}
    />
  );
}
