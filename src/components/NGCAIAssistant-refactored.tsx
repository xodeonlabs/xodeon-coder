import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  Check,
  X,
  Loader2,
  Sparkles,
  Plus,
  MessageSquare,
  Trash2,
  ArrowLeft,
  Pencil,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAIConversations, useAIChat, type AIMessage, type AIConversation } from '@/hooks/useAIChat';
import { usePlanLimits, logAIUsage } from '@/hooks/usePlanLimits';
import { CoinConfirmDialog } from '@/components/CoinConfirmDialog';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger } from '@/lib/error-handling';

interface NGCAIAssistantProps {
  appId: string;
  currentCode: string;
  onApplyCode: (newCode: string) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ngc-ai-assist`;

/**
 * Extract NGC code from markdown code blocks
 */
function extractNGCCode(text: string): string | null {
  const match = text.match(/```(?:ngc)?\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

/**
 * Count added lines between two code snippets
 */
function countAddedLines(oldCode: string, newCode: string): number {
  const oldLines = oldCode.split('\n').length;
  const newLines = newCode.split('\n').length;
  return Math.max(0, newLines - oldLines);
}

/**
 * Improved AI Assistant with better code structure
 */
export function NGCAIAssistant({ appId, currentCode, onApplyCode }: NGCAIAssistantProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const { canUseAI, aiUsagePercent, loading: planLoading } = usePlanLimits(session?.user?.id);

  const {
    conversations,
    loading: convosLoading,
    create: createConversation,
    rename: renameConversation,
    remove: deleteConversation,
  } = useAIConversations(session?.user?.id, appId);

  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const { messages, loading: messagesLoading, addMessage, updateLastMessage, saveMessage } = useAIChat(activeConvoId || undefined);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [editingConvoId, setEditingConvoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [coinConfirm, setCoinConfirm] = useState<{
    open: boolean;
    amount: number;
    description: string;
    onConfirm: () => void;
  }>({ open: false, amount: 0, description: '', onConfirm: () => {} });

  const editInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Handle conversation creation
   */
  const handleCreateConversation = useCallback(async () => {
    const convo = await createConversation();
    if (convo) {
      setActiveConvoId(convo.id);
      // messages will reload via useAIChat when activeConvoId changes
      setView('chat');
      setPendingCode(null);
    }
  }, [createConversation]);

  /**
   * Handle conversation rename
   */
  const handleRename = useCallback(
    async (convoId: string, currentTitle: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setEditingConvoId(convoId);
      setEditingTitle(currentTitle);
      setTimeout(() => editInputRef.current?.focus(), 50);
    },
    []
  );

  /**
   * Confirm conversation rename
   */
  const confirmRename = useCallback(async () => {
    if (!editingConvoId || !editingTitle.trim()) {
      setEditingConvoId(null);
      return;
    }

    const success = await renameConversation(editingConvoId, editingTitle.trim());
    if (success) {
      if (activeConvoId === editingConvoId) {
        // Update title in the right place
      }
      setEditingConvoId(null);
    }
  }, [editingConvoId, editingTitle, renameConversation, activeConvoId]);

  /**
   * Handle AI message sending
   */
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !activeConvoId || !session?.user?.id) return;

    if (!canUseAI) {
      toast({
        title: 'Plan limit bereikt',
        description: 'Je hebt het maximale aantal AI berichten bereikt voor deze maand.',
        variant: 'destructive',
      });
      return;
    }

    const userMessage: AIMessage = { role: 'user', content: input.trim() };
    const userInput = input.trim();

    addMessage(userMessage);
    setInput('');
    setIsLoading(true);
    setPendingCode(null);

    // Save user message
    await saveMessage('user', userMessage.content);

    // Auto-title on first message
    if (messages.length === 0) {
      const title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
      await renameConversation(activeConvoId, title);
    }

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          currentCode,
          userMessage: userInput,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      if (!response.body) throw new Error('No response stream');

      // Add assistant message placeholder
      addMessage({ role: 'assistant', content: '' });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

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
              updateLastMessage(assistantContent);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      await saveMessage('assistant', assistantContent);

      // Update conversation timestamp
      await supabase
        .from('ai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConvoId);

      // Log AI usage
      await logAIUsage(session.user.id, activeConvoId, 1, 0, 0);

      // Extract code if present
      const extracted = extractNGCCode(assistantContent);
      if (extracted) setPendingCode(extracted);

      errorLogger.info('NGCAIAssistant.send', 'Message sent successfully', {
        appId,
        conversationId: activeConvoId,
        messageLength: assistantContent.length,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      addMessage({ role: 'assistant', content: `❌ ${errorMsg}` });
      errorLogger.error('NGCAIAssistant.send', 'Failed to send message', err, { appId });
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    isLoading,
    activeConvoId,
    session?.user?.id,
    canUseAI,
    messages,
    currentCode,
    addMessage,
    saveMessage,
    renameConversation,
    updateLastMessage,
    toast,
    appId,
  ]);

  /**
   * Handle code application
   */
  const handleApplyCode = useCallback(async () => {
    if (!pendingCode || !session?.user?.id) return;

    const addedLines = countAddedLines(currentCode, pendingCode);
    const cost = addedLines;

    if (cost <= 0) {
      onApplyCode(pendingCode);
      setPendingCode(null);
      return;
    }

    setCoinConfirm({
      open: true,
      amount: cost,
      description: `AI added ${addedLines} new lines. Cost: 1 coin per line.`,
      onConfirm: async () => {
        try {
          const { data: coinRow } = await supabase
            .from('user_coins')
            .select('id, balance')
            .eq('user_id', session.user.id)
            .maybeSingle();

          const balance = (coinRow as any)?.balance ?? 0;

          if (balance < cost) {
            toast({
              title: 'Not enough coins',
              description: `You need ${cost} coins but have ${balance}.`,
              variant: 'destructive',
            });
            return;
          }

          // Deduct coins
          await supabase
            .from('user_coins')
            .update({ balance: balance - cost, updated_at: new Date().toISOString() })
            .eq('id', (coinRow as any).id);

          // Log usage
          if (activeConvoId) {
            await logAIUsage(session.user.id, activeConvoId, 0, addedLines, cost);
          }

          toast({
            title: `${cost} coins deducted`,
            description: `Applied ${addedLines} lines of code.`,
          });

          onApplyCode(pendingCode);
          setPendingCode(null);
          setCoinConfirm(prev => ({ ...prev, open: false }));
        } catch (err) {
          errorLogger.error('handleApplyCode', 'Failed to apply code', err);
          toast({
            title: 'Error',
            description: 'Failed to deduct coins. Try again.',
            variant: 'destructive',
          });
        }
      },
    });
  }, [pendingCode, currentCode, session?.user?.id, activeConvoId, onApplyCode, toast]);

  // Conversation list view
  if (view === 'list') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-foreground">AI Chats</span>
          </div>
          <button
            onClick={handleCreateConversation}
            disabled={!canUseAI}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        </div>

        {!canUseAI && !planLoading && (
          <div className="p-2 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-xs text-yellow-600">Plan limit reached</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {convosLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Bot className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
              <p className="text-[10px] text-muted-foreground">No conversations yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => {
                    setActiveConvoId(convo.id);
                    setView('chat');
                    setPendingCode(null);
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-secondary/40 transition-colors group flex items-center gap-2"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    {editingConvoId === convo.id ? (
                      <input
                        ref={editInputRef}
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onBlur={confirmRename}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmRename();
                          if (e.key === 'Escape') setEditingConvoId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-foreground bg-secondary border border-border rounded px-1.5 py-0.5 w-full outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : (
                      <p className="text-xs text-foreground truncate">{convo.title}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(convo.updated_at).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {editingConvoId !== convo.id && (
                    <button
                      onClick={e => handleRename(convo.id, convo.title, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all shrink-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteConversation(convo.id);
                    }}
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
        <span className="text-[11px] font-semibold text-foreground flex-1 truncate">
          {conversations.find(c => c.id === activeConvoId)?.title || 'AI Chat'}
        </span>
        {!canUseAI && <Lock className="h-3.5 w-3.5 text-yellow-600" />}
      </div>

      {/* Usage indicator */}
      {aiUsagePercent > 75 && (
        <div className="px-2 py-1 bg-yellow-500/10 border-b border-yellow-500/20">
          <p className="text-[9px] text-yellow-600">
            AI usage: {aiUsagePercent}% - Plan limit approaching
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2">
        {messagesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="h-8 w-8 text-muted-foreground mx-auto opacity-40 mb-2" />
            <p className="text-[10px] text-muted-foreground">Start a conversation with the AI</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs rounded-lg p-2 text-xs ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {/* Pending code display */}
        {pendingCode && (
          <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-2 space-y-2">
            <pre className="text-[9px] bg-background rounded p-1 overflow-x-auto text-muted-foreground">
              <code>{pendingCode.slice(0, 200)}...</code>
            </pre>
            <div className="flex gap-2">
              <button
                onClick={handleApplyCode}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-700 active:scale-95"
              >
                <Check className="h-3 w-3" /> Apply
              </button>
              <button
                onClick={() => setPendingCode(null)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-destructive text-white text-xs font-semibold hover:bg-destructive/90 active:scale-95"
              >
                <X className="h-3 w-3" /> Discard
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 shrink-0 space-y-1">
        {!canUseAI && (
          <div className="text-xs text-yellow-600 bg-yellow-500/10 p-1 rounded">
            Plan limit reached. Upgrade to continue.
          </div>
        )}
        <div className="flex gap-1">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask the AI..."
            disabled={isLoading || !canUseAI}
            className="flex-1 px-2 py-1 rounded text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim() || !canUseAI}
            className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {coinConfirm.open && (
        <CoinConfirmDialog
          open={coinConfirm.open}
          amount={coinConfirm.amount}
          description={coinConfirm.description}
          onConfirm={coinConfirm.onConfirm}
          onCancel={() => setCoinConfirm(prev => ({ ...prev, open: false }))}
        />
      )}
    </div>
  );
}
