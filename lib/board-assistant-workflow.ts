import { Agent, AgentInputItem, Runner, withTrace } from "@openai/agents"

// Tool execution handler type
export type ToolExecutor = (
  toolName: string,
  args: Record<string, unknown>
) => Promise<unknown>

// Parse tool calls from text output
// Handles patterns like: create_card(boardId="...", listId="...", title="...")
function parseToolCallsFromText(text: string): Array<{ name: string; args: Record<string, unknown> }> {
  const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = []
  
  // Match patterns like: tool_name(arg1="value1", arg2="value2")
  // This regex handles multi-line tool calls and nested quotes
  const toolCallRegex = /(\w+)\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g
  let match
  
  while ((match = toolCallRegex.exec(text)) !== null) {
    const toolName = match[1]
    const argsString = match[2].trim()
    
    // Only process if this looks like a valid tool name
    const validToolNames = ["move_card", "create_card", "update_card", "create_list", "rename_list"]
    if (!validToolNames.includes(toolName)) {
      continue
    }
    
    // Parse arguments: key="value" or key=value
    const args: Record<string, unknown> = {}
    
    // Handle quoted and unquoted values, including values with commas inside quotes
    const argRegex = /(\w+)\s*=\s*("(?:[^"\\]|\\.)*"|[^,)]+)/g
    let argMatch
    
    while ((argMatch = argRegex.exec(argsString)) !== null) {
      const key = argMatch[1]
      let value = argMatch[2].trim()
      
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1)
      }
      
      // Try to parse as number or boolean, otherwise keep as string
      if (value === "true") {
        args[key] = true
      } else if (value === "false") {
        args[key] = false
      } else if (!isNaN(Number(value)) && value.trim() !== "" && !isNaN(parseFloat(value))) {
        args[key] = Number(value)
      } else {
        args[key] = value
      }
    }
    
    if (Object.keys(args).length > 0) {
      toolCalls.push({ name: toolName, args })
    }
  }
  
  return toolCalls
}

// Create the board assistant agent
export function createBoardAssistant() {
  // Use OpenAI model (not Azure deployment name)
  const model = process.env.OPENAI_MODEL || "gpt-4.1"

  return new Agent({
    name: "Board Assistant",
    instructions: `You are an AI Kanban Board Assistant for a Trello-style board application.

You receive:

- userMessage: the user's natural language request.

- boardId: the id of the current board.

- boardSnapshot: a JSON object describing the board.

boardSnapshot has the shape:

{
  "boardId": "string",
  "title": "string",
  "lists": [
    {
      "id": "string",
      "title": "string",
      "order": number,
      "cards": [
        {
          "id": "string",
          "title": "string",
          "description": "string or null",
          "order": number
        }
      ]
    }
  ]
}

Rules:

- Use ONLY the tool calls provided to modify data.

- All listId and cardId arguments in tools MUST come from boardSnapshot.

- boardId in tool calls MUST be the boardId input you receive.

- If more than one card or list shares the same title, ask the user to clarify before using tools.

- destinationIndex is 0-based: 0 = top of the list.

- If the user says "top", use destinationIndex = 0.

- If the user says "bottom" or doesn't specify, you may omit destinationIndex to append.

Tools:

- move_card(boardId, cardId, destinationListId, destinationIndex?)

- create_card(boardId, listId, title, description?, destinationIndex?)

- update_card(boardId, cardId, title?, description?)

- create_list(boardId, title, destinationIndex?)

- rename_list(boardId, listId, newTitle)

- reorder_list(boardId, items) - items is an array of {id: string, order: number} where id is the listId and order is the new position (0-based). Use this when the user wants to change the order of lists (e.g., "move 'Done' to the end" or "put 'In Progress' first").

When the user asks for changes, translate userMessage + boardSnapshot into tool calls.

For reorder_list, you need to provide ALL lists in their new order. For example, if there are 3 lists [A, B, C] and the user wants to move A to the end, provide items: [{id: "B", order: 0}, {id: "C", order: 1}, {id: "A", order: 2}].

IMPORTANT: When you need to call a tool, output it in this exact format on a single line:
tool_name(arg1="value1", arg2="value2")

For example:
create_card(boardId="abc-123", listId="def-456", title="New Card")

After tools execute, summarize in 1–2 short sentences what changed.

If the request is ambiguous, ask a clarifying question instead of guessing.`,
    model: model,
    modelSettings: {
      temperature: 1,
      topP: 1,
      maxTokens: 2048,
      store: true,
    },
  })
}

type WorkflowInput = {
  input_as_text: string
  userMessage: string
  boardId: string
  boardSnapshot: unknown
  conversationHistory?: Array<{
    role: "user" | "assistant"
    content: string
  }>
}

// Main workflow entrypoint
export async function runWorkflow(
  workflow: WorkflowInput,
  toolExecutor: ToolExecutor
) {
  return await withTrace("Board-Management-Bot", async () => {
    // Build conversation history from previous messages
    const previousHistory: AgentInputItem[] = []
    
    if (workflow.conversationHistory && workflow.conversationHistory.length > 0) {
      // Convert previous conversation history to AgentInputItem format
      for (const msg of workflow.conversationHistory) {
        previousHistory.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: [
            {
              type: msg.role === "user" ? "input_text" : "output_text",
              text: msg.content,
            },
          ],
        } as AgentInputItem)
      }
    }

    // Add current user message and board snapshot
    const conversationHistory: AgentInputItem[] = [
      ...previousHistory,
      {
        role: "user",
        content: [{ type: "input_text", text: `User request: ${workflow.userMessage}` }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Current board snapshot (JSON): ${JSON.stringify(workflow.boardSnapshot, null, 2)}`,
          },
        ],
      },
    ]

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: `board-${workflow.boardId}`,
      },
    })

    const boardAssistant = createBoardAssistant()

    // Run agent and handle tool calls iteratively
    let currentHistory = conversationHistory
    let finalOutput = ""
    let maxIterations = 5
    let iteration = 0

    while (iteration < maxIterations) {
      iteration++

      const agentResult = await runner.run(boardAssistant, currentHistory)

      // Check if agent wants to call tools
      const lastMessage = agentResult.newItems[agentResult.newItems.length - 1]
      const rawItem = lastMessage?.rawItem
      
      console.log("[Board Assistant] Agent result:", JSON.stringify(rawItem, null, 2))
      
      // Check for structured tool calls first
      const hasStructuredToolCalls =
        rawItem &&
        typeof rawItem === "object" &&
        "tool_calls" in rawItem &&
        Array.isArray(rawItem.tool_calls) &&
        rawItem.tool_calls.length > 0
      
      // If no structured tool calls, check text output for tool call patterns
      let parsedToolCalls: Array<{ name: string; args: Record<string, unknown> }> = []
      if (!hasStructuredToolCalls) {
        const outputText = agentResult.finalOutput || ""
        parsedToolCalls = parseToolCallsFromText(outputText)
        console.log("[Board Assistant] Parsed tool calls from text:", parsedToolCalls)
      }
      
      const hasToolCalls = hasStructuredToolCalls || parsedToolCalls.length > 0
      console.log("[Board Assistant] Has tool calls:", hasToolCalls)

      if (hasToolCalls) {
        const toolResults: AgentInputItem[] = []
        
        if (hasStructuredToolCalls && rawItem && "tool_calls" in rawItem) {
          // Execute structured tool calls
          console.log("[Board Assistant] Tool calls detected:", rawItem.tool_calls)
          for (const toolCall of rawItem.tool_calls as Array<{
            id: string
            function?: { name: string; arguments: string }
          }>) {
            const functionCall = toolCall.function
            if (!functionCall) continue

            console.log(`[Board Assistant] Executing tool: ${functionCall.name} with args:`, functionCall.arguments)
            try {
              const result = await toolExecutor(
                functionCall.name,
                JSON.parse(functionCall.arguments || "{}")
              )
              console.log(`[Board Assistant] Tool ${functionCall.name} result:`, result)

              toolResults.push({
                role: "tool",
                content: [
                  {
                    type: "tool_result",
                    tool_call_id: toolCall.id,
                    result: JSON.stringify(result),
                  },
                ],
              } as AgentInputItem)
            } catch (error) {
              toolResults.push({
                role: "tool",
                content: [
                  {
                    type: "tool_result",
                    tool_call_id: toolCall.id,
                    result: JSON.stringify({
                      error: error instanceof Error ? error.message : "Unknown error",
                    }),
                  },
                ],
              } as AgentInputItem)
            }
          }
        } else if (parsedToolCalls.length > 0) {
          // Execute parsed tool calls from text
          for (const toolCall of parsedToolCalls) {
            console.log(`[Board Assistant] Executing parsed tool: ${toolCall.name} with args:`, toolCall.args)
            try {
              const result = await toolExecutor(toolCall.name, toolCall.args)
              console.log(`[Board Assistant] Tool ${toolCall.name} result:`, result)

              // Create a synthetic tool result message
              toolResults.push({
                role: "assistant",
                content: [
                  {
                    type: "output_text",
                    text: `Tool ${toolCall.name} executed successfully. Result: ${JSON.stringify(result)}`,
                  },
                ],
              } as AgentInputItem)
            } catch (error) {
              toolResults.push({
                role: "assistant",
                content: [
                  {
                    type: "output_text",
                    text: `Tool ${toolCall.name} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                  },
                ],
              } as AgentInputItem)
            }
          }
        }

        // Add tool results to history and continue
        currentHistory = [
          ...currentHistory,
          ...agentResult.newItems.map((item) => item.rawItem),
          ...toolResults,
        ]
        
        // After executing tools, ask the agent to summarize
        currentHistory.push({
          role: "user",
          content: [
            {
              type: "input_text",
              text: "The tools have been executed. Please provide a brief summary of what was done.",
            },
          ],
        })
      } else {
        // No more tool calls, we're done
        finalOutput = agentResult.finalOutput || ""
        break
      }
    }

    if (!finalOutput) {
      throw new Error("Agent did not produce a final output")
    }

    return {
      output_text: finalOutput,
    }
  })
}

