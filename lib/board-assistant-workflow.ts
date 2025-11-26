import { Agent, AgentInputItem, Runner, withTrace } from "@openai/agents"
import OpenAI from "openai"

// Tool execution handler type
export type ToolExecutor = (
  toolName: string,
  args: Record<string, unknown>
) => Promise<unknown>

// Parse tool calls from text output
// Handles patterns like: create_card(boardId="...", listId="...", title="...")
// Also handles: reorder_list(boardId="...", items=[{...}])
function parseToolCallsFromText(text: string): Array<{ name: string; args: Record<string, unknown> }> {
  const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = []
  
  // Valid tool names
  const validToolNames = ["create_board", "move_card", "create_card", "update_card", "create_list", "rename_list", "reorder_list"]
  
  // Find all tool calls - look for each tool name followed by parentheses
  for (const toolName of validToolNames) {
    // Find all occurrences of this tool call (not just the first one)
    let searchIndex = 0
    while (true) {
      // Find the start of the tool call
      const toolIndex = text.indexOf(toolName + "(", searchIndex)
      if (toolIndex === -1) break // No more occurrences
      
      // Find the matching closing parenthesis, accounting for nested brackets/braces
      let start = toolIndex + toolName.length + 1
      let depth = 0
      let inString = false
      let stringChar = ""
      let end = start
    
    for (let i = start; i < text.length; i++) {
      const char = text[i]
      const prevChar = i > 0 ? text[i - 1] : ""
      
      // Track string boundaries
      if ((char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
          stringChar = ""
        }
      }
      
      // Track bracket/brace depth (only when not in string)
      if (!inString) {
        if (char === "[" || char === "{" || char === "(") {
          depth++
        } else if (char === "]" || char === "}" || char === ")") {
          if (depth === 0 && char === ")") {
            // Found the closing parenthesis
            end = i
            break
          }
          depth--
        }
      }
    }
    
    if (end > start) {
      const argsString = text.slice(start, end).trim()
      const args: Record<string, unknown> = {}
      
      // Parse arguments - split by comma but respect nested structures
      let currentArg = ""
      let argDepth = 0
      let argInString = false
      let argStringChar = ""
      
      for (let i = 0; i < argsString.length; i++) {
        const char = argsString[i]
        const prevChar = i > 0 ? argsString[i - 1] : ""
        
        // Track string boundaries
        if ((char === '"' || char === "'") && prevChar !== "\\") {
          if (!argInString) {
            argInString = true
            argStringChar = char
          } else if (char === argStringChar) {
            argInString = false
            argStringChar = ""
          }
        }
        
        // Track depth
        if (!argInString) {
          if (char === "[" || char === "{" || char === "(") {
            argDepth++
          } else if (char === "]" || char === "}" || char === ")") {
            argDepth--
          }
        }
        
        currentArg += char
        
        // If comma at depth 0, process this argument
        if (char === "," && argDepth === 0 && !argInString) {
          const arg = currentArg.slice(0, -1).trim()
          parseArgument(arg, args)
          currentArg = ""
        }
      }
      
      // Process last argument
      if (currentArg.trim()) {
        parseArgument(currentArg.trim(), args)
      }
      
      if (Object.keys(args).length > 0) {
        toolCalls.push({ name: toolName, args })
      }
      
      // Move search index past this tool call to find the next occurrence
      searchIndex = end + 1
    } // end if (end > start)
    } // end while (true)
  } // end for (const toolName of validToolNames)
  
  return toolCalls
}

// Helper function to parse a single argument (key=value)
function parseArgument(arg: string, args: Record<string, unknown>) {
  const equalIndex = arg.indexOf("=")
  if (equalIndex <= 0) return
  
  const key = arg.slice(0, equalIndex).trim()
  let value = arg.slice(equalIndex + 1).trim()
  
  // Remove surrounding quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  
  // Try to parse as JSON (for arrays/objects)
  if (value.startsWith("[") || value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value)
      // Validate that it's actually an array or object
      if (Array.isArray(parsed) || (typeof parsed === "object" && parsed !== null)) {
        args[key] = parsed
        return
      }
    } catch (e) {
      // If JSON parsing fails, log for debugging but keep as string
      console.warn(`[Board Assistant] Failed to parse JSON for ${key}:`, value, e)
    }
  }
  
  // Try to parse as number or boolean
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

// Create the board assistant agent
export function createBoardAssistant() {
  // Use OpenAI model (not Azure deployment name)
  const model = process.env.OPENAI_MODEL || "gpt-4.1"

  return new Agent({
    name: "Board Assistant",
    instructions: `You are an AI Project Board Assistant for a Trello-style kanban board application.
You can:
Understand the user’s project idea or goal
Propose and create a project structure (lists/columns + tasks/cards)
Reorganize the board by moving cards, creating cards, creating/renaming lists, and updating cards
Summarize the current board and explain what you changed
Inputs you receive
You receive three logical inputs:
userMessage – the user’s natural language request
boardId – the id of the current board
boardSnapshot – a JSON object describing the current board state
boardSnapshot has the shape:
{   "boardId": "string",   "title": "string",   "lists": [     {       "id": "string",       "title": "string",       "order": number,       "cards": [         {           "id": "string",           "title": "string",           "description": "string or null",           "order": number         }       ]     }   ] } 
All list and card IDs you use must come from this snapshot.
Tools available
You MUST use the following tool call syntax to modify the board. When you need to perform an action, output the tool call in this exact format:

move_card(boardId="...", cardId="...", destinationListId="...", destinationIndex=0)
create_card(boardId="...", listId="...", title="...", description="...", destinationIndex=0)
update_card(boardId="...", cardId="...", title="...", description="...")
create_list(boardId="...", title="...", destinationIndex=0)
rename_list(boardId="...", listId="...", newTitle="...")
create_board(title="...", workspaceId="...")
reorder_list(boardId="...", items=[{"id":"...","order":0}])

CRITICAL: When the user asks you to create, move, or modify something, you MUST output the tool call syntax above. Do NOT just describe what you will do - you MUST output the actual tool call in the format shown. 

Example: If the user says "create a list called External Issues", your response should include:
create_list(boardId="[actual-board-id-from-input]", title="External Issues")

Do NOT say "I will create..." without also outputting the tool call. The tool call MUST be in your response text.

Core rules
Use ONLY the tool call syntax shown above to modify the board. Output tool calls directly in your response when actions are needed.
All listId and cardId arguments in tools must come from boardSnapshot.
boardId in tool calls must be the boardId input you receive.
destinationIndex is 0-based:
0 = top of the list
If the user says “top”, use destinationIndex = 0.
If the user says “bottom” or doesn’t specify position, you may omit destinationIndex to append.
If more than one card or list shares the same title or is ambiguous, ask the user to clarify before using tools.
When the user requests changes, translate userMessage + boardSnapshot into tool calls, then describe what you did.
Project-idea behavior (planning + creation)
When the user shares a project idea, goal, or initiative (e.g. “I want to launch a marketing campaign”, “Build an AI board assistant”, “Set up a new finance workflow”):
Understand and decompose the idea
Identify major phases or categories (e.g. “Backlog”, “Planning”, “In Progress”, “Testing”, “Done”, or project-specific groupings like “Research”, “Implementation”, “Launch”).
Identify concrete tasks that represent good candidate cards.
Design a board structure
If suitable lists already exist, reuse them.
If the structure is missing, propose and create new lists with create_list.
Choose clear, project-appropriate list titles.
Create tasks as cards
For each major task or sub-task, create a card with create_card.
Use concise but meaningful titles.
Put more detail (steps, acceptance criteria, notes) into the description field.
If the user mentions priorities, deadlines, or tags, include them textually in the description (e.g. Priority: High, Due: 2025-12-01).
Assignments / owners
If the user mentions owners or assignees (e.g. “Prithvi handles the backend”, “Assign this to Sarah”), reflect this using cards:
Include ownership in the title and/or description, e.g. Owner: Sarah or [Owner: Prithvi].
Use create_card or update_card to add or update this information.
Do not assume any hidden assignee field beyond what is present in boardSnapshot; represent assignment in text.
Ask for clarification when needed
If the project idea is very vague, ask one or two focused clarifying questions (e.g. “Is this for a single product or multiple products?”, “Do you prefer a simple To Do / Doing / Done board or more detailed phases?”).
If the user says something like “create 100 tasks” but doesn’t specify which list, ask which list to use or propose a reasonable default list and confirm.
Avoid over-creating
If a project idea is small, don’t spam the board with unnecessary lists/cards.
Start with a reasonable, organized structure and expand only as requested.
Board summarization behavior
When the user asks you to summarize the board or understand the current state:
Read boardSnapshot and respond in natural language, e.g.:
How many lists and cards exist.
High-level description of each list and notable cards.
Any obvious gaps or next steps.
Do not call tools when only a summary is requested.
If the user wants both a summary and changes (e.g. “Summarize this board and clean it up”), summarize first, then call tools to make the requested edits.
General interaction rules
Be proactive but not pushy:
If the user says “I want to build X”, you may suggest a structure and ask: “Would you like me to create these lists and initial tasks for you?”
If they say yes, then call create_list and create_card.
If the user gives a simple request (e.g. “create card 'Fix bug' in TODO”), don't over-plan—just output the tool call immediately and do it.

When outputting tool calls, place them at the beginning or end of your response, clearly separated. For example:
"create_list(boardId=\"abc123\", title=\"External Issues\")

I've created the External Issues list for you."

After tools execute, always return a short, concrete summary of changes in 1–3 sentences, for example:
“I created 3 new lists (Backlog, Build, Launch) and added 5 cards based on your AI board assistant idea.”
“I created 100 cards titled ‘1’ through ‘100’ in the ‘Test List’ to stress-test the board.”
If the request is ambiguous, incomplete, or conflicts with the existing structure, ask a clarifying question instead of guessing, and wait for the user’s response before calling tools.


Safety & Abuse Prevention Rules
Never create, move, or delete large numbers of cards or lists automatically.
If the user requests more than 10 cards, ask for explicit confirmation.
If the user requests more than 25, politely refuse because it may indicate abuse or accidental overuse.
Example refusal: “For safety reasons, I cannot create that many cards automatically. Please specify a smaller number (10 or fewer).”
Never perform bulk destructive actions (like deleting or moving an entire board or all cards) unless the user explicitly confirms twice.
Never mutate the board based solely on a vague “yes.”
If a confirmation is needed, re-state the action clearly: “Just to confirm: you want me to create 8 cards in ‘Tasks’ — correct?”
If a request seems malicious, extremely large, or ambiguous, refuse politely and suggest safe alternatives.
If the request could impact performance or cause spam, you must:
Ask for confirmation
Give a warning
Refuse if over the configured limits.`,
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
  workspaceId?: string
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
    // PRIORITY 1: Try platform workflow first (if configured)
    const workflowId = process.env.OPENAI_BOARD_ASSISTANT_WORKFLOW_ID
    
    // Validate workflow ID format (should start with 'wf_' and be a valid format)
    const isValidWorkflowId = workflowId && workflowId.trim().length > 0 && workflowId.startsWith('wf_')
    
    if (workflowId && isValidWorkflowId) {
      console.log(`[Board Assistant] Attempting platform workflow first: ${workflowId}`)
      try {
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY!,
        })

        // Build the input for the platform workflow
        const workflowInput = {
          input_as_text: workflow.input_as_text,
          userMessage: workflow.userMessage,
          boardId: workflow.boardId || "",
          boardSnapshot: workflow.boardSnapshot || null,
          workspaceId: workflow.workspaceId || "",
          conversationHistory: workflow.conversationHistory || [],
        }

        const response = await fetch(`https://api.openai.com/v1/workflows/${workflowId}/runs`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "workflows=v3",
          },
          body: JSON.stringify({
            inputs: workflowInput,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`[Board Assistant] Platform workflow response received:`, JSON.stringify(data, null, 2))
          
          let output = data.outputs?.output_text ?? data.outputs?.output_parsed ?? data.outputs ?? data
          
          // If output is a string, try to parse it
          if (typeof output === "string") {
            try {
              output = JSON.parse(output)
            } catch {
              // If it's not JSON, use it as is
            }
          }

          // Check if the output contains tool calls that need execution
          // Platform workflows might return tool calls that need to be executed
          if (output && typeof output === "object") {
            // Check for tool calls in the output
            const toolCalls = output.tool_calls || output.toolCalls || []
            
            if (Array.isArray(toolCalls) && toolCalls.length > 0) {
              console.log(`[Board Assistant] Platform workflow returned ${toolCalls.length} tool call(s), executing...`)
              // Execute tool calls from platform workflow
              const toolResults = []
              for (const toolCall of toolCalls) {
                const toolName = toolCall.function?.name || toolCall.name
                const toolArgs = typeof toolCall.function?.arguments === "string" 
                  ? JSON.parse(toolCall.function.arguments) 
                  : toolCall.args || toolCall.arguments || {}
                
                try {
                  const result = await toolExecutor(toolName, toolArgs)
                  toolResults.push({ tool: toolName, result })
                  console.log(`[Board Assistant] Executed tool ${toolName} from platform workflow`)
                } catch (error) {
                  console.error(`[Board Assistant] Failed to execute tool ${toolName} from platform workflow:`, error)
                  toolResults.push({ tool: toolName, error: error instanceof Error ? error.message : "Unknown error" })
                }
              }
            }

            // Return the response from platform workflow
            if ("output_text" in output) {
              console.log(`[Board Assistant] ✅ Successfully completed platform workflow ${workflowId}`)
              return {
                output_text: output.output_text || JSON.stringify(output),
                newBoardId: output.newBoardId,
              }
            } else if (typeof output === "string" || (typeof output === "object" && output !== null)) {
              console.log(`[Board Assistant] ✅ Successfully completed platform workflow ${workflowId}`)
              return {
                output_text: typeof output === "string" ? output : JSON.stringify(output),
                newBoardId: output.newBoardId,
              }
            }
          } else if (typeof output === "string" && output.trim()) {
            console.log(`[Board Assistant] ✅ Successfully completed platform workflow ${workflowId}`)
            return {
              output_text: output,
              newBoardId: undefined,
            }
          }
          
          // If we got here, the output format is unexpected - fall through to local agent
          console.warn(`[Board Assistant] Platform workflow returned unexpected output format, falling back to local agent`)
        } else {
          const errorText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: { message: errorText } }
          }
          
          // Check if it's a 404 "Invalid URL" error - this means the workflow doesn't exist
          if (response.status === 404) {
            console.warn(`[Board Assistant] Platform workflow not found (404): ${workflowId}`)
            console.warn(`[Board Assistant] Error details:`, errorData.error?.message || errorText)
            console.warn(`[Board Assistant] This workflow ID may not exist in your OpenAI account, or the API endpoint format may have changed.`)
            console.log(`[Board Assistant] Falling back to local agent`)
          } else {
            console.warn(`[Board Assistant] Platform workflow API failed (${response.status}): ${errorText}`)
            console.log(`[Board Assistant] Falling back to local agent`)
          }
        }
      } catch (error) {
        console.warn(`[Board Assistant] Platform workflow error:`, error)
        console.log(`[Board Assistant] Falling back to local agent`)
        // Continue to fallback
      }
    } else if (workflowId && !isValidWorkflowId) {
      console.warn(`[Board Assistant] Invalid workflow ID format: ${workflowId}`)
      console.warn(`[Board Assistant] Workflow ID should start with 'wf_'. Using local agent instead.`)
    } else {
      console.log(`[Board Assistant] No platform workflow ID configured, using local agent`)
    }

    // PRIORITY 2: Fallback to local agent
    console.log(`[Board Assistant] Running local agent...`)

    // PRIORITY 2: Fallback to local agent (only if platform workflow fails or is not configured)
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
    let newBoardId: string | undefined = undefined
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

              // Track new board ID if board was created
              if (functionCall.name === "create_board" && result && typeof result === "object" && "newBoardId" in result) {
                newBoardId = result.newBoardId as string
              }

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
            console.log(`[Board Assistant] Executing parsed tool: ${toolCall.name} with args:`, JSON.stringify(toolCall.args, null, 2))
            try {
              const result = await toolExecutor(toolCall.name, toolCall.args)
              console.log(`[Board Assistant] Tool ${toolCall.name} result:`, result)

              // Track new board ID if board was created
              if (toolCall.name === "create_board" && result && typeof result === "object" && "newBoardId" in result) {
                newBoardId = result.newBoardId as string
              }

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
              const errorMessage = error instanceof Error ? error.message : "Unknown error"
              console.error(`[Board Assistant] Tool ${toolCall.name} execution failed:`, errorMessage, error)
              toolResults.push({
                role: "assistant",
                content: [
                  {
                    type: "output_text",
                    text: `Tool ${toolCall.name} failed: ${errorMessage}. Please check the arguments and try again.`,
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
      newBoardId: newBoardId,
    }
  })
}

