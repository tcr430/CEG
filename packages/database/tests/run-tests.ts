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
    assert.equal(latest?.id, first.id);
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
    const usageRepository = createInMemoryUsageEventRepository();
    const auditRepository = createInMemoryAuditEventRepository();

    const usageEvent = await usageRepository.createUsageEvent({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      eventName: "prospect_research_completed",
      quantity: 1,
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

    assert.equal(usageEvent.eventName, "prospect_research_completed");
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
        messageVersion: 1,
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

    const draftReply = await draftReplyRepository.createDraftReply({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      threadId: thread.id,
      messageId: message.id,
      subject: "More context",
      bodyText: "Happy to send a short summary.",
      structuredOutput: {
        draftVersion: 1,
      },
      modelMetadata: {
        provider: "openai",
      },
    });

    const latestAnalysis = await analysisRepository.getReplyAnalysisByMessage(message.id);
    const draftReplies = await draftReplyRepository.listDraftRepliesByMessage(message.id);

    assert.equal(thread.status, "open");
    assert.equal(message.direction, "inbound");
    assert.equal(analysis.intent, "needs_more_info");
    assert.equal(latestAnalysis?.intent, "needs_more_info");
    assert.equal(draftReplies[0]?.id, draftReply.id);
  }
  console.log("@ceg/database repository contract tests passed");
}

await run();

