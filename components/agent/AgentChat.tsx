'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ToolCall {
  tool: string;
  success: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  discoveryResults?: DiscoveryResult[];
}

interface DiscoveryResult {
  url: string;
  domain: string;
  title: string;
  type: string;
  linkability_score: number;
  relevance_score: number;
}

interface Props {
  projectId: string;
  initialMessages?: ChatMessage[];
  onProspectsImported?: () => void;
}

const STARTER_PROMPTS = [
  'Find me backlink targets for my site',
  'Check my pipeline and tell me what needs attention',
  'Draft follow-up emails for prospects I haven\'t heard back from',
];

const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  analyse_site: { running: 'Analysing site...', done: 'Site analysed' },
  check_existing_backlinks: { running: 'Checking backlinks...', done: 'Backlinks checked' },
  run_discovery: { running: 'Running discovery...', done: 'Discovery complete' },
  import_prospects: { running: 'Importing prospects...', done: 'Prospects imported' },
  validate_import: { running: 'Validating URLs...', done: 'URLs validated' },
  confirm_import: { running: 'Confirming import...', done: 'Import confirmed' },
  enrich_contacts: { running: 'Enriching contacts...', done: 'Contacts enriched' },
  generate_outreach_email: { running: 'Drafting email...', done: 'Email drafted' },
  generate_bulk_emails: { running: 'Drafting emails...', done: 'Emails drafted' },
  get_pipeline_summary: { running: 'Loading pipeline...', done: 'Pipeline loaded' },
  get_prospects_needing_attention: { running: 'Checking prospects...', done: 'Check complete' },
  update_prospect_status: { running: 'Updating status...', done: 'Status updated' },
  check_link_live: { running: 'Verifying link...', done: 'Link verified' },
};

export function AgentChat({ projectId, initialMessages = [], onProspectsImported }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        setMessages([
          ...updatedMessages,
          {
            role: 'assistant',
            content: `Something went wrong: ${error.error ?? 'Unknown error'}. Please try again.`,
          },
        ]);
        return;
      }

      const data = await res.json();

      // Check if discovery results are embedded in the response
      let discoveryResults: DiscoveryResult[] | undefined;
      if (data.tool_calls?.some((tc: ToolCall) => tc.tool === 'run_discovery' && tc.success)) {
        // Parse discovery results from the message if present
        discoveryResults = parseDiscoveryFromMessage(data.message);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        toolCalls: data.tool_calls,
        discoveryResults,
      };

      setMessages([...updatedMessages, assistantMessage]);

      // Notify parent if prospects were imported
      if (data.tool_calls?.some((tc: ToolCall) =>
        (tc.tool === 'import_prospects' || tc.tool === 'confirm_import') && tc.success,
      )) {
        onProspectsImported?.();
      }
    } catch {
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: 'Failed to reach the server. Please check your connection and try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm font-medium text-slate-700 mb-4">
              Ask me to manage your backlink campaign
            </p>
            <div className="space-y-2 w-full max-w-md">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {/* Tool call badges (shown before the assistant message) */}
            {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {msg.toolCalls.map((tc, j) => {
                  const label = TOOL_LABELS[tc.tool];
                  return (
                    <span
                      key={j}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        tc.success
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {tc.success ? '\u2713' : '\u2717'} {label?.done ?? tc.tool}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Message bubble */}
            <div
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="animate-pulse">Thinking</span>
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function parseDiscoveryFromMessage(message: string): DiscoveryResult[] | undefined {
  // Discovery results are shown inline by the agent in its text response
  // This is a best-effort parser - the agent formats them as tables
  return undefined;
}
