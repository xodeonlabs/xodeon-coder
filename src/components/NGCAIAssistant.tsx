import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Check, X, Loader2, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface NGCAIAssistantProps {
  currentCode: string;
  onApplyCode: (newCode: string) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ngc-ai-assist`;

function extractNGCCode(text: string): string | null {
  // Match ```ngc ... ``` or ``` ... ``` code blocks
  const match = text.match(/```(?:ngc)?\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

export function NGCAIAssistant({ currentCode, onApplyCode }: NGCAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setPendingCode(null);

    let assistantContent = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          currentCode,
          userMessage: input.trim(),
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Fout ${resp.status}`);
      }

      if (!resp.body) throw new Error('Geen response stream');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const updateAssistant = (content: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { role: 'assistant', content }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              updateAssistant(assistantContent);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Check if response contains NGC code
      const extracted = extractNGCCode(assistantContent);
      if (extracted) {
        setPendingCode(extracted);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Onbekende fout';
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, currentCode, isLoading]);

  const handleApply = () => {
    if (pendingCode) {
      onApplyCode(pendingCode);
      setPendingCode(null);
    }
  };

  const handleReject = () => {
    setPendingCode(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border shrink-0">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-foreground">AI Assistent</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-4 space-y-2">
            <Bot className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
            <p className="text-[10px] text-muted-foreground">
              Vraag de AI om je code aan te passen.<br />
              Bijv. "Voeg een rode knop toe" of "Maak de achtergrond donkerder"
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`rounded-lg px-2.5 py-1.5 text-xs max-w-[90%] break-words whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {msg.role === 'assistant' 
                ? msg.content.replace(/```(?:ngc)?\s*\n[\s\S]*?```/g, '📄 [NGC code - zie hieronder]')
                : msg.content
              }
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-[10px]">AI denkt na...</span>
          </div>
        )}

        {/* Pending code apply/reject */}
        {pendingCode && !isLoading && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 space-y-2">
            <p className="text-[10px] text-foreground font-medium">AI heeft nieuwe code voorgesteld:</p>
            <pre className="text-[9px] text-muted-foreground bg-background rounded p-1.5 max-h-24 overflow-y-auto font-mono">
              {pendingCode.slice(0, 300)}{pendingCode.length > 300 ? '...' : ''}
            </pre>
            <div className="flex gap-1.5">
              <button
                onClick={handleApply}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <Check className="h-3 w-3" /> Toepassen
              </button>
              <button
                onClick={handleReject}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <X className="h-3 w-3" /> Afwijzen
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 flex gap-1.5 shrink-0">
        <input
          className="flex-1 rounded bg-background border border-border px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          placeholder="Vraag de AI iets..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="rounded p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
