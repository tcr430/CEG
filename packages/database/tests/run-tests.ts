import assert from "node:assert/strict";

import {
  createInMemoryAuditEventRepository,
  createInMemoryCampaignRepository,
  createInMemoryConversationThreadRepository,
  createInMemoryDraftReplyRepository,
  createInMemoryMessageRepository,
  createInMemoryProspectRepository,
  createInMemoryReplyAnalysisRepository,
  createInMemoryResearchSnapshotRepository,
  createInMemorySequenceRepository,
  createInMemorySenderProfileRepository,
  createInMemorySubscriptionRepository,
  createInMemoryUsageEventRepository,
  createCampaignRepository,
  createProspectRepository,
  createSenderProfileRepository,
  createWorkspaceRepository,
  type DatabaseClient,
  type DatabaseQuery,
} from "../dist/index.js";

function createMockClient(
  rowsQueue: unknown[][],
  queries: DatabaseQuery[] = [],
): DatabaseClient {
  return {
    async query<TRow>(query: DatabaseQuery<TRow>) {
      queries.push(query);
      const rows = (rowsQueue.shift() ?? []) as TRow[];
      return { rows };
    },
    async transaction<TValue>(
      run: (_tx: { commit(): Promise<void>; rollback(): Promise<void> }) => Promise<TValue>,
    ) {
      return run({
        async commit() {
          return;
        },
        async rollback() {
          return;
        },
      });
    },
  };
}

async function run(): Promise<void> {
  {
    const repository = createInMemorySequenceRepository();
    const first = await repository.createSequence({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
      prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
      generationMode: "basic",
      content: {
        sequenceVersion: 1,
      },
      qualityChecksJson: {
        generatedAt: new Date("2026-03-28T10:00:00.000Z"),
        summary: {
          score: 78,
          label: "strong",
          blocked: false,
        },
        dimensions: [
          {
            name: "tone_fit",
            score: 78,
            label: "strong",
            details: "Tone stays grounded.",
          },
        ],
        checks: [],
        notes: [],
      },
      modelMetadata: {
        provider: "openai",
      },
    });

    const latest = await repository.getLatestSequenceByProspect(
      "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
      "54ad043c-9435-4388-92b9-9e0becbeff74",
    );

    assert.equal(first.generationMode, "basic");
    assert.equal(first.qualityChecksJson?.summary.score, 78);
    assert.equal(latest?.id, first.id);
    assert.equal(latest?.qualityChecksJson?.summary.label, "strong");
  }

  {
    const repository = createInMemoryCampaignRepository();
    const created = await repository.createCampaign({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      name: "Q2 Pipeline Push",
      offerSummary: "Book qualified demos",
      targetIcp: "Series A SaaS",
      targetIndustries: ["SaaS"],
      tonePreferences: {
        do: ["Stay crisp"],
        avoid: ["Avoid vague urgency"],
      },
      frameworkPreferences: ["Problem -> proof -> CTA"],
      settings: {},
    });

    const fetched = await repository.getCampaignById(created.id);
    const updated = await repository.updateCampaign({
      campaignId: created.id,
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      name: "Q2 Pipeline Push v2",
      offerSummary: "Book qualified meetings",
      targetIcp: "Series A and B SaaS",
      targetIndustries: ["SaaS", "Fintech"],
      tonePreferences: {
        do: ["Lead with proof"],
        avoid: ["Avoid vague claims"],
      },
      frameworkPreferences: ["Insight -> proof -> CTA"],
      status: "active",
      settings: {},
    });

    assert.equal(fetched?.targetIcp, "Series A SaaS");
    assert.equal(updated.targetIndustries.length, 2);
  }

  {
    const queries: DatabaseQuery[] = [];
    const client = createMockClient(
      [
        [
          {
            id: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
            slug: "acme",
            name: "Acme",
            owner_user_id: null,
            status: "active",
            settings: {},
            created_at: "2026-03-27T10:00:00.000Z",
            updated_at: "2026-03-27T10:00:00.000Z",
          },
        ],
      ],
      queries,
    );

    const repository = createWorkspaceRepository(client);
    const workspace = await repository.createWorkspace({
      slug: "acme",
      name: "Acme",
      settings: {},
    });

    assert.equal(workspace.slug, "acme");
    assert.match(queries[0]?.statement ?? "", /INSERT INTO workspaces/);
  }

  {
    const client = createMockClient([]);
    const repository = createSenderProfileRepository(client);

    await assert.rejects(
      () => repository.listSenderProfilesByWorkspace("not-a-uuid"),
      /workspaceId must be a UUID/,
    );
  }

  {
    const repository = createInMemorySenderProfileRepository();
    const created = await repository.createSenderProfile({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      name: "SDR Profile",
      senderType: "sdr",
      proofPoints: ["Booked 18 meetings last month"],
      goals: ["Generate qualified pipeline"],
      tonePreferences: {
        do: ["Be concise"],
        avoid: ["Avoid hype"],
      },
      metadata: {},
      status: "active",
      isDefault: true,
    });

    const fetched = await repository.getSenderProfileById(created.id);
    const listed = await repository.listSenderProfilesByWorkspace(
      "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
    );
    const updated = await repository.updateSenderProfile({
      senderProfileId: created.id,
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      name: "SDR Profile v2",
      senderType: "basic",
      proofPoints: ["Booked 18 meetings last month"],
      goals: ["Keep outreach simple"],
      tonePreferences: {
        do: ["Stay clear"],
        avoid: ["Avoid jargon"],
      },
      metadata: {},
      status: "active",
      isDefault: true,
    });

    assert.equal(fetched?.name, "SDR Profile");
    assert.equal(listed.length, 1);
    assert.equal(updated.senderType, "basic");
  }

  {
    const queries: DatabaseQuery[] = [];
    const client = createMockClient(
      [
        [
          {
            id: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
            workspace_id: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
            sender_profile_id: null,
            brand_voice_profile_id: null,
            name: "Spring Outreach",
            description: null,
            objective: null,
            offer_summary: null,
            target_persona: "Series A SaaS",
            status: "draft",
            settings: {
              targetIcp: "Series A SaaS",
              targetIndustries: ["SaaS"],
              tonePreferences: {
                do: ["Stay crisp"],
                avoid: ["Avoid vague urgency"],
              },
              frameworkPreferences: ["Problem -> proof -> CTA"],
            },
            created_by_user_id: null,
            created_at: "2026-03-27T10:00:00.000Z",
            updated_at: "2026-03-27T10:00:00.000Z",
          },
        ],
      ],
      queries,
    );

    const repository = createCampaignRepository(client);
    const campaign = await repository.createCampaign({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      name: "Spring Outreach",
      targetIcp: "Series A SaaS",
      targetIndustries: ["SaaS"],
      tonePreferences: {
        do: ["Stay crisp"],
        avoid: ["Avoid vague urgency"],
      },
      frameworkPreferences: ["Problem -> proof -> CTA"],
      settings: {},
    });

    assert.equal(campaign.senderProfileId, null);
    assert.equal(campaign.targetIcp, "Series A SaaS");
    assert.deepEqual(queries[0]?.params?.slice(0, 2), [
      "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      null,
    ]);
  }

  {
    const repository = createInMemoryProspectRepository();
    const created = await repository.createProspect({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
      companyName: "Acme",
      companyWebsite: "https://acme.com",
      contactName: "Jamie Stone",
      email: "jamie@acme.com",
      status: "new",
      metadata: {},
    });

    const fetched = await repository.getProspectById(created.id);
    const updated = await repository.updateProspect({
      prospectId: created.id,
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
      companyName: "Acme",
      companyWebsite: "https://acme.com",
      contactName: "Jordan Stone",
      email: "jordan@acme.com",
      status: "contacted",
      metadata: {},
    });

    assert.equal(fetched?.contactName, "Jamie Stone");
    assert.equal(updated.status, "contacted");
  }

  {
    const snapshotRepository = createInMemoryResearchSnapshotRepository();
    const snapshot = await snapshotRepository.createResearchSnapshot({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
      sourceUrl: "https://acme.com",
      evidence: [],
      structuredData: {
        companyProfile: {
          domain: "acme.com",
          websiteUrl: "https://acme.com",
          targetCustomers: [],
          industries: [],
          valuePropositions: [],
          proofPoints: [],
          differentiators: [],
          likelyPainPoints: [],
          personalizationHooks: [],
          callsToAction: [],
          sourceEvidence: [],
          confidence: {
            score: 0.7,
            label: "medium",
            reasons: ["Stable copy"],
          },
          flags: [],
          metadata: {},
        },
        quality: {
          overall: {
            score: 0.7,
            label: "medium",
            reasons: ["Stable copy"],
          },
          dimensions: [],
          flags: [],
        },
        trainingRecord: {},
      },
      rawCapture: {},
    });

    const latest = await snapshotRepository.getLatestResearchSnapshotByProspect(
      "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      "54ad043c-9435-4388-92b9-9e0becbeff74",
    );

    assert.equal(snapshot.sourceUrl, "https://acme.com");
    assert.equal(latest?.id, snapshot.id);
  }

  {
    const subscriptionRepository = createInMemorySubscriptionRepository();

    const first = await subscriptionRepository.upsertSubscription({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      provider: "stripe",
      providerCustomerId: "cus_123",
      providerSubscriptionId: "sub_123",
      planCode: "pro",
      status: "active",
      seats: 1,
      billingEmail: "owner@example.com",
      currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-04-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      metadata: {},
    });

    const updated = await subscriptionRepository.upsertSubscription({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      provider: "stripe",
      providerCustomerId: "cus_123",
      providerSubscriptionId: "sub_123",
      planCode: "agency",
      status: "past_due",
      seats: 3,
      billingEmail: "billing@example.com",
      currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-04-01T00:00:00.000Z"),
      cancelAtPeriodEnd: true,
      metadata: { source: "webhook" },
    });

    const latest = await subscriptionRepository.getLatestSubscriptionByWorkspace(
      "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
    );
    const bySubscriptionId = await subscriptionRepository.getSubscriptionByProviderSubscriptionId(
      "stripe",
      "sub_123",
    );
    const byCustomerId = await subscriptionRepository.getSubscriptionByProviderCustomerId(
      "stripe",
      "cus_123",
    );

    assert.equal(first.planCode, "pro");
    assert.equal(updated.id, first.id);
    assert.equal(updated.planCode, "agency");
    assert.equal(latest?.status, "past_due");
    assert.equal(bySubscriptionId?.billingEmail, "billing@example.com");
    assert.equal(byCustomerId?.seats, 3);
  }

  {
    const usageRepository = createInMemoryUsageEventRepository();
    const auditRepository = createInMemoryAuditEventRepository();

    const usageEvent = await usageRepository.createUsageEvent({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      eventName: "prospect_research_completed",
      quantity: 1,
      billable: false,
      metadata: {},
    });
    const usageEventTwo = await usageRepository.createUsageEvent({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      eventName: "sequence_generated",
      quantity: 2,
      billable: false,
      metadata: {},
    });

    const auditEvent = await auditRepository.createAuditEvent({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      action: "prospect.research.completed",
      entityType: "prospect",
      changes: {},
      metadata: {},
    });

    const usageEvents = await usageRepository.listUsageEventsByWorkspace(
      "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
    );
    const rangedEvents = await usageRepository.listUsageEventsByWorkspaceAndOccurredAtRange({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      occurredFrom: new Date(Date.now() - 60_000),
      occurredTo: new Date(Date.now() + 60_000),
    });

    assert.equal(usageEvent.eventName, "prospect_research_completed");
    assert.equal(usageEventTwo.quantity, 2);
    assert.equal(usageEvents.length, 2);
    assert.equal(rangedEvents.length, 2);
    assert.equal(auditEvent.action, "prospect.research.completed");
  }

  {
    const client = createMockClient([
      [
        {
          id: "54ad043c-9435-4388-92b9-9e0becbeff74",
          workspace_id: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
          campaign_id: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
          full_name: "Jamie Stone",
          first_name: "Jamie",
          last_name: "Stone",
          email: "jamie@example.com",
          title: "VP Sales",
          company_name: "Acme",
          company_domain: "acme.com",
          company_website: "https://acme.com",
          linkedin_url: null,
          location: null,
          source: "manual",
          status: "new",
          metadata: {},
          created_by_user_id: null,
          created_at: "2026-03-27T10:00:00.000Z",
          updated_at: "2026-03-27T10:00:00.000Z",
        },
      ],
    ]);

    const repository = createProspectRepository(client);
    const prospects = await repository.listProspectsByCampaign(
      "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
    );

    assert.equal(prospects[0]?.fullName, "Jamie Stone");
    assert.equal(prospects[0]?.contactName, "Jamie Stone");
    assert.equal(prospects[0]?.campaignId, "a6092054-22bf-4a2e-bf5c-6ca287c3dab1");
  }

  {
    const threadRepository = createInMemoryConversationThreadRepository();
    const messageRepository = createInMemoryMessageRepository();
    const analysisRepository = createInMemoryReplyAnalysisRepository();
    const draftReplyRepository = createInMemoryDraftReplyRepository();

    const thread = await threadRepository.findOrCreateThreadForProspect({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
      prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
      metadata: {},
    });

    const generatedOutbound = await messageRepository.createMessage({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      threadId: thread.id,
      campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
      prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
      direction: "outbound",
      messageKind: "email",
      status: "draft",
      subject: "Worth a look?",
      bodyText: "I put together a short outbound draft.",
      metadata: {
        source: "generated",
        generatedFrom: "sequence",
        messageVersion: 1,
        sequenceVersion: 2,
      },
    });

    const manualOutbound = await messageRepository.createMessage({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      threadId: thread.id,
      campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
      prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
      direction: "outbound",
      messageKind: "email",
      status: "draft",
      subject: "Manual follow-up",
      bodyText: "Adding a manual note to the thread.",
      metadata: {
        source: "manual",
        messageVersion: 2,
      },
    });

    const message = await messageRepository.createMessage({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      threadId: thread.id,
      campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
      prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
      direction: "inbound",
      messageKind: "reply",
      status: "received",
      subject: "Re: outreach",
      bodyText: "Can you send more information?",
      metadata: {
        source: "imported",
        importedFrom: "manual-copy",
        messageVersion: 3,
      },
    });

    const analysis = await analysisRepository.upsertReplyAnalysis({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      threadId: thread.id,
      messageId: message.id,
      classification: "neutral",
      sentiment: "neutral",
      urgency: "low",
      intent: "needs_more_info",
      confidence: 0.7,
      structuredOutput: {
        analysisVersion: 1,
      },
      modelMetadata: {
        provider: "openai",
      },
    });

    const newerAnalysis = await analysisRepository.upsertReplyAnalysis({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      threadId: thread.id,
      messageId: message.id,
      classification: "neutral",
      sentiment: "neutral",
      urgency: "low",
      intent: "needs_more_info",
      confidence: 0.82,
      structuredOutput: {
        analysisVersion: 2,
      },
      modelMetadata: {
        provider: "openai",
      },
    });

    const draftReply = await draftReplyRepository.createDraftReply({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      threadId: thread.id,
      messageId: message.id,
      subject: "More context",
      bodyText: "Happy to send a short summary.",
      structuredOutput: {
        draftVersion: 1,
        bundleId: "bundle-1",
      },
      qualityChecksJson: {
        generatedAt: new Date("2026-03-28T10:00:00.000Z"),
        summary: {
          score: 72,
          label: "review",
          blocked: false,
        },
        dimensions: [
          {
            name: "relevance_to_inbound_reply",
            score: 72,
            label: "review",
            details: "Reply addresses the inbound request.",
          },
        ],
        checks: [],
        notes: [],
      },
      modelMetadata: {
        provider: "openai",
      },
    });

    const secondDraftReply = await draftReplyRepository.createDraftReply({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      threadId: thread.id,
      messageId: message.id,
      subject: "Short summary",
      bodyText: "Here is the concise version.",
      structuredOutput: {
        draftVersion: 2,
        bundleId: "bundle-2",
      },
      modelMetadata: {
        provider: "openai",
      },
    });

    const latestAnalysis = await analysisRepository.getReplyAnalysisByMessage(message.id);
    const analyses = await analysisRepository.listReplyAnalysesByThread(thread.id);
    const draftReplies = await draftReplyRepository.listDraftRepliesByMessage(message.id);
    const threadDraftReplies = await draftReplyRepository.listDraftRepliesByThread(thread.id);
    const threadMessages = await messageRepository.listMessagesByThread(thread.id);

    assert.equal(thread.status, "open");
    assert.equal(generatedOutbound.metadata.source, "generated");
    assert.equal(manualOutbound.metadata.source, "manual");
    assert.equal(message.metadata.source, "imported");
    assert.equal(message.direction, "inbound");
    assert.equal(analysis.intent, "needs_more_info");
    assert.equal(latestAnalysis?.confidence, newerAnalysis.confidence);
    assert.equal(analyses.length, 1);
    assert.equal(threadDraftReplies.length, 2);
    assert.equal(threadMessages.length, 3);
    assert.equal(draftReply.qualityChecksJson?.summary.score, 72);
    assert.deepEqual(new Set(draftReplies.map((draft) => draft.id)), new Set([draftReply.id, secondDraftReply.id]));
  }
  console.log("@ceg/database repository contract tests passed");
}

await run();

