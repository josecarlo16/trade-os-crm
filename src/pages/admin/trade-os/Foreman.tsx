import { useRef, useState, useEffect, useCallback } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { useAssistant } from '@/components/admin/assistant/AssistantContext';
import { ChatMessage } from '@/components/admin/assistant/ChatMessage';
import { QuickPrompts } from '@/components/admin/assistant/QuickPrompts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Full-page Foreman AI — this is NOT a new AI integration. It's the same
 * assistant already running site-wide (AssistantProvider -> the
 * "ai-assistant" edge function, the floating "Bach Assistant" panel you see
 * elsewhere in admin), just laid out as its own page instead of a side
 * panel. Same conversation, same backend, same tools. Reuses ChatMessage/
 * QuickPrompts as-is rather than re-implementing message rendering.
 */
export default function TradeOSForemanPage() {
  const { messages, isLoading, sendMessage, clearConversation, confirmAction } = useAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const lastAssistantIdx = messages.reduceRight((found, m, i) => {
    if (found >= 0) return found;
    return m.role === 'assistant' && !m.isLoading ? i : -1;
  }, -1);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    await sendMessage(text);
  }, [input, isLoading, sendMessage]);

  return (
    <Card className="flex h-[calc(100vh-140px)] flex-col overflow-hidden bg-tradeos-surface border-tradeos-line">
      <div className="flex flex-none items-center justify-between border-b border-tradeos-line bg-tradeos-steel px-4 py-3">
        <span className="font-condensed text-sm font-bold uppercase tracking-widest text-tradeos-steel-ink">Foreman AI</span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearConversation}
            className="rounded p-1.5 text-tradeos-steel-ink/60 transition-colors hover:bg-white/10 hover:text-tradeos-steel-ink"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <QuickPrompts onSelect={(prompt) => sendMessage(prompt)} />
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLatestAssistant={idx === lastAssistantIdx}
                onConfirm={() => confirmAction(msg.id, 'confirmed')}
                onCancel={() => confirmAction(msg.id, 'cancelled')}
                onSendMessage={(p) => sendMessage(p)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-none border-t border-tradeos-line bg-tradeos-surface-2 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Foreman anything…"
            rows={2}
            className="max-h-[200px] min-h-[44px] flex-1 resize-none rounded-lg border border-tradeos-line bg-tradeos-surface px-3 py-2 text-sm text-tradeos-ink placeholder:text-tradeos-ink-3 focus:outline-none focus:ring-2 focus:ring-tradeos-accent/40"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 200) + 'px';
            }}
          />
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-9 w-9 flex-none rounded-full bg-tradeos-accent hover:bg-tradeos-accent"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
