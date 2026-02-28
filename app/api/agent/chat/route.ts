import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AGENT_TOOLS } from '@/src/lib/agent/tools';
import { executeAgentTool } from '@/src/lib/agent/executor';
import { AGENT_SYSTEM_PROMPT } from '@/src/lib/agent/prompt';
import { requireApiAuth, isResponse, badRequest } from '@/src/lib/api-utils';
import { getProjectById, createAgentMessage } from '@/src/lib/store';
import { logger } from '@/src/lib/logger';

const log = logger.create('agent-chat');

const MAX_TURNS = 10;

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  let body: { project_id: string; messages: Array<{ role: string; content: string }> };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!body.project_id || !body.messages?.length) {
    return badRequest('project_id and messages are required');
  }

  const project = await getProjectById(body.project_id, auth.orgId);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const client = new Anthropic();

  // Persist the latest user message
  const lastUserMsg = body.messages[body.messages.length - 1];
  if (lastUserMsg?.role === 'user') {
    await createAgentMessage({
      project_id: body.project_id,
      user_id: auth.userId,
      role: 'user',
      content: typeof lastUserMsg.content === 'string'
        ? lastUserMsg.content
        : JSON.stringify(lastUserMsg.content),
    });
  }

  // Convert incoming messages to Anthropic format
  let currentMessages: Anthropic.MessageParam[] = body.messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const toolCallsLog: Array<{ tool: string; input: unknown; result: unknown }> = [];
  let finalText = '';
  let turns = 0;

  // Agentic loop — keep calling Claude until it returns end_turn
  while (turns < MAX_TURNS) {
    turns++;
    log.info('Agent turn', { turn: turns, project_id: body.project_id });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: AGENT_SYSTEM_PROMPT(body.project_id),
      tools: AGENT_TOOLS,
      messages: currentMessages,
    });

    // Append assistant response
    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response.content },
    ];

    // Extract text content
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    );
    if (textBlocks.length > 0) {
      finalText = textBlocks.map((b) => b.text).join('\n');
    }

    // If no tool calls, we're done
    if (response.stop_reason === 'end_turn') {
      break;
    }

    // Execute all tool calls
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    if (toolUseBlocks.length === 0) {
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      log.info('Executing tool', { tool: block.name });
      try {
        const result = await executeAgentTool(
          block.name,
          block.input as Record<string, unknown>,
          body.project_id,
          auth.orgId,
        );
        toolCallsLog.push({ tool: block.name, input: block.input, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Tool execution failed';
        log.error('Tool execution error', { tool: block.name, error: errorMsg });
        toolCallsLog.push({ tool: block.name, input: block.input, result: { error: errorMsg } });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: errorMsg }),
          is_error: true,
        });
      }
    }

    // Add tool results and loop back
    currentMessages = [
      ...currentMessages,
      { role: 'user', content: toolResults },
    ];
  }

  // Persist assistant response
  await createAgentMessage({
    project_id: body.project_id,
    user_id: auth.userId,
    role: 'assistant',
    content: finalText,
    tool_calls: toolCallsLog.length > 0 ? toolCallsLog : undefined,
  });

  return NextResponse.json({
    message: finalText,
    tool_calls: toolCallsLog.map((t) => ({
      tool: t.tool,
      success: !('error' in (t.result as Record<string, unknown>)),
    })),
  });
}
