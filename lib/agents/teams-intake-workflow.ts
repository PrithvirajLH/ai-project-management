"use server"

import { z } from "zod"
import { Agent, AgentInputItem, Runner } from "@openai/agents"

export type TriageResult = {
  action: "create_card" | "no_card"
  reason: string
  message_type: "service_request" | "incident" | "investigation" | "question" | "other"
  card: {
    title: string | null
    description: string | null
    priority: "low" | "medium" | "high" | null
  }
}

const TeamsTriageAgentSchema = z.object({
  action: z.enum(["create_card", "no_card"]),
  reason: z.string(),
  message_type: z.enum(["service_request", "incident", "investigation", "question", "other"]),
  card: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    priority: z.enum(["low", "medium", "high"]).nullable().default("medium"),
  }),
})

const teamsTriageAgent = new Agent({
  name: "Teams Triage Agent",
  instructions: `You are a request triage assistant used for Microsoft Teams messages.

Your job:
- Decide whether a message should become a work item card on an IT kanban board.
- Classify the type of message.
- If a card is needed, propose a good title, description, and priority.

Rules:
- Create a card if the user is clearly asking for work to be done (a request, issue, or investigation), even if phrased as a question.
- Create a card if the message reports a problem that must be investigated (e.g. "why are BOMs not receiving emails?").
- Do NOT create a card for:
  - Pure clarifying questions about existing work (e.g. "Is ticket 123 assigned?")
  - Social messages, greetings, or thanks ("hi", "thanks", etc.)
- When you create a card:
  - Title should be short and specific.
  - Description should succinctly explain what needs to be done.
  - Priority should be "high", "medium", or "low".

You MUST respond in valid JSON with this exact schema:
{
  "action": "create_card" | "no_card",
  "reason": "string",
  "message_type": "service_request" | "incident" | "investigation" | "question" | "other",
  "card": {
    "title": "string or null",
    "description": "string or null",
    "priority": "low" | "medium" | "high" | null
  }
}`,
  model: process.env.OPENAI_TEAMS_TRIAGE_MODEL ?? "gpt-4.1-mini",
  outputType: TeamsTriageAgentSchema,
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 512,
    store: false,
  },
})

export async function runTeamsIntakeWorkflow(messageText: string): Promise<TriageResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY")
  }

  const runner = new Runner({
    traceMetadata: {
      __trace_source__: "agent-builder",
      workflow_id: process.env.OPENAI_TEAMS_WORKFLOW_TRACE_ID ?? "teams-triage-local",
    },
  })

  const conversationHistory: AgentInputItem[] = [
    {
      role: "user",
      content: [{ type: "input_text", text: `Teams message: ${messageText}` }],
    },
  ]

  const result = await runner.run(teamsTriageAgent, conversationHistory)

  if (!result.finalOutput) {
    throw new Error("Teams triage agent did not produce an output")
  }

  const parsed = TeamsTriageAgentSchema.parse(result.finalOutput)
  return parsed
}



