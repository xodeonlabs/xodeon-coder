import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Check, X, Loader2, Sparkles, Plus, MessageSquare, Trash2, ArrowLeft, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface NGCAIAssistantProps {
  appId: string;
  currentCode: string;
  onApplyCode: (newCode: string) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ngc-ai-assist`;

function extractNGCCode(text: string): string | null {
  const match = text.match(/```(?:ngc)?\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

export function NGCAIAssistant({ appId, currentCode, onApplyCode }: NGCAIAssistantProps) {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [editingConvoId, setEditingConvoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!session?.user?.id || !appId) return;
    setLoadingConvos(true);
    supabase
      .from('ai_conversations')
      .select('*')
      .eq('app_id', appId)
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (data) setConversations(data as Conversation[]);
        setLoadingConvos(false);
      });
  }, [appId, session?.user?.id]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConvoId) { setMessages([]); return; }
    supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', activeConvoId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })));
      });
  }, [activeConvoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createConversation = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({ app_id: appId, user_id: session.user.id, title: 'Nieuw gesprek' })
      .select()
      .single();
    if (data && !error) {
      const convo = data as Conversation;
      setConversations(prev => [convo, ...prev]);
      setActiveConvoId(convo.id);
      setMessages([]);
      setView('chat');
      setPendingCode(null);
    }
  }, [appId, session?.user?.id]);

  const deleteConversation = useCallback(async (convoId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await supabase.from('ai_conversations').delete().eq('id', convoId);
    setConversations(prev => prev.filter(c => c.id !== convoId));
    if (activeConvoId === convoId) {
      setActiveConvoId(null);
      setMessages([]);
      setView('list');
    }
  }, [activeConvoId]);

  const startRename = useCallback((convoId: string, currentTitle: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingConvoId(convoId);
    setEditingTitle(currentTitle);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, []);

  const confirmRename = useCallback(async () => {
    if (!editingConvoId || !editingTitle.trim()) {
      setEditingConvoId(null);
      return;
    }
    await supabase.from('ai_conversations').update({ title: editingTitle.trim() }).eq('id', editingConvoId);
    setConversations(prev => prev.map(c => c.id === editingConvoId ? { ...c, title: editingTitle.trim() } : c));
    setEditingConvoId(null);
  }, [editingConvoId, editingTitle]);

  const openConversation = (convo: Conversation) => {
    setActiveConvoId(convo.id);
    setView('chat');
    setPendingCode(null);
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !activeConvoId) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setPendingCode(null);

    // Save user message
    await supabase.from('ai_messages').insert({
      conversation_id: activeConvoId,
      role: 'user',
      content: userMsg.content,
    });

    // Auto-title on first message
    if (messages.length === 0) {
      const title = userMsg.content.slice(0, 50) + (userMsg.content.length > 50 ? '...' : '');
      await supabase.from('ai_conversations').update({ title }).eq('id', activeConvoId);
      setConversations(prev => prev.map(c => c.id === activeConvoId ? { ...c, title } : c));
    }

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

      // Save assistant message
      await supabase.from('ai_messages').insert({
        conversation_id: activeConvoId,
        role: 'assistant',
        content: assistantContent,
      });

      // Update conversation timestamp
      await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvoId);

      const extracted = extractNGCCode(assistantContent);
      if (extracted) setPendingCode(extracted);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Onbekende fout';
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, currentCode, isLoading, activeConvoId]);

  const handleApply = () => {
    if (pendingCode) {
      onApplyCode(pendingCode);
      setPendingCode(null);
    }
  };

  // Conversation list view
  if (view === 'list') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-foreground">AI Gesprekken</span>
          </div>
          <button
            onClick={createConversation}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3 w-3" /> Nieuw
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingConvos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Bot className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
              <p className="text-[10px] text-muted-foreground">
                Nog geen gesprekken.<br />Start een nieuw gesprek met de AI.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => openConversation(convo)}
                  className="w-full text-left px-3 py-2.5 hover:bg-secondary/40 transition-colors group flex items-center gap-2"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    {editingConvoId === convo.id ? (
                      <input
                        ref={editInputRef}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={confirmRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename();
                          if (e.key === 'Escape') setEditingConvoId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-foreground bg-secondary border border-border rounded px-1.5 py-0.5 w-full outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : (
                      <p className="text-xs text-foreground truncate">{convo.title}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(convo.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {editingConvoId !== convo.id && (
                    <button
                      onClick={(e) => startRename(convo.id, convo.title, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all shrink-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => deleteConversation(convo.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border shrink-0">
        <button
          onClick={() => setView('list')}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        {editingConvoId === activeConvoId ? (
          <input
            ref={editInputRef}
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={confirmRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmRename();
              if (e.key === 'Escape') setEditingConvoId(null);
            }}
            className="text-[11px] font-semibold text-foreground bg-secondary border border-border rounded px-1.5 py-0.5 flex-1 min-w-0 outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <span
            onClick={() => activeConvoId && startRename(activeConvoId, conversations.find(c => c.id === activeConvoId)?.title || '')}
            className="text-[11px] font-semibold text-foreground truncate flex-1 cursor-pointer hover:text-primary transition-colors"
            title="Klik om te hernoemen"
          >
            {conversations.find(c => c.id === activeConvoId)?.title || 'AI Assistent'}
          </span>
        )}
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
          <div key={msg.id || i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
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

        {pendingCode && !isLoading && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 space-y-2">
            <p className="text-[10px] text-foreground font-medium">AI heeft nieuwe code voorgesteld:</p>
            <pre className="text-[9px] text-muted-foreground bg-background rounded p-1.5 max-h-24 overflow-y-auto font-mono">
              {pendingCode.slice(0, 300)}{pendingCode.length > 300 ? '...' : ''}
            </pre>
            <div className="flex gap-1.5">
              <button
                onClick={handleApply}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
              >
                <Check className="h-3 w-3" /> Toepassen
              </button>
              <button
                onClick={() => setPendingCode(null)}
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
