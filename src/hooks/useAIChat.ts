import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger, handleSupabaseError } from '@/lib/error-handling';

export interface AIMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface AIConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  app_id: string;
  user_id: string;
}

interface UseAIConversationsBaseState {
  conversations: AIConversation[];
  loading: boolean;
  error: string | null;
}

interface UseAIConversationsState extends UseAIConversationsBaseState {
  create: (title?: string) => Promise<AIConversation | null>;
  rename: (conversationId: string, newTitle: string) => Promise<boolean>;
  remove: (conversationId: string) => Promise<boolean>;
}

/**
 * Hook to manage AI conversations
 */
export function useAIConversations(
  userId: string | undefined,
  appId: string | undefined
): UseAIConversationsState {
  const [state, setState] = useState<UseAIConversationsBaseState>({
    conversations: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!userId || !appId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const { data, error } = await supabase
          .from('ai_conversations')
          .select('*')
          .eq('app_id', appId)
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        setState(prev => ({
          ...prev,
          conversations: (data as AIConversation[]) || [],
          loading: false,
        }));
      } catch (err) {
        const userMessage = handleSupabaseError('useAIConversations.load', err, {
          userId,
          appId,
        });
        setState(prev => ({
          ...prev,
          loading: false,
          error: userMessage,
        }));
      }
    })();
  }, [userId, appId]);

  const create = useCallback(
    async (title = 'Nieuw gesprek'): Promise<AIConversation | null> => {
      if (!userId || !appId) return null;

      try {
        const { data, error } = await supabase
          .from('ai_conversations')
          .insert({ app_id: appId, user_id: userId, title })
          .select()
          .single();

        if (error) throw error;

        const conversation = data as AIConversation;
        setState(prev => ({
          ...prev,
          conversations: [conversation, ...prev.conversations],
        }));

        errorLogger.info('useAIConversations.create', 'Created conversation', {
          conversationId: conversation.id,
          appId,
        });

        return conversation;
      } catch (err) {
        const userMessage = handleSupabaseError('useAIConversations.create', err);
        setState(prev => ({ ...prev, error: userMessage }));
        return null;
      }
    },
    [userId, appId]
  );

  const rename = useCallback(async (conversationId: string, newTitle: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ title: newTitle })
        .eq('id', conversationId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(c =>
          c.id === conversationId ? { ...c, title: newTitle } : c
        ),
      }));

      return true;
    } catch (err) {
      errorLogger.error('useAIConversations.rename', 'Failed to rename', err);
      return false;
    }
  }, []);

  const remove = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('ai_conversations').delete().eq('id', conversationId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        conversations: prev.conversations.filter(c => c.id !== conversationId),
      }));

      return true;
    } catch (err) {
      errorLogger.error('useAIConversations.delete', 'Failed to delete', err);
      return false;
    }
  }, []);

  return {
    ...state,
    create,
    rename,
    remove,
  };
}

interface UseAIChatBaseState {
  messages: AIMessage[];
  loading: boolean;
  error: string | null;
}

interface UseAIChatState extends UseAIChatBaseState {
  addMessage: (message: AIMessage) => void;
  updateLastMessage: (content: string) => void;
  saveMessage: (role: 'user' | 'assistant', content: string) => Promise<boolean>;
}

/**
 * Hook to manage AI messages in a conversation
 */
export function useAIChat(conversationId: string | undefined): UseAIChatState {
  const [state, setState] = useState<UseAIChatBaseState>({
    messages: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!conversationId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const { data, error } = await supabase
          .from('ai_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setState(prev => ({
          ...prev,
          messages: (data as AIMessage[]) || [],
          loading: false,
        }));
      } catch (err) {
        const userMessage = handleSupabaseError('useAIChat.load', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: userMessage,
        }));
      }
    })();
  }, [conversationId]);

  const addMessage = useCallback(
    (message: AIMessage) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
      }));
    },
    []
  );

  const updateLastMessage = useCallback((content: string) => {
    setState(prev => {
      const messages = [...prev.messages];
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        messages[messages.length - 1] = { ...lastMessage, content };
      }
      return { ...prev, messages };
    });
  }, []);

  const saveMessage = useCallback(
    async (role: 'user' | 'assistant', content: string): Promise<boolean> => {
      if (!conversationId) return false;

      try {
        const { error } = await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role,
          content,
        });

        if (error) throw error;

        return true;
      } catch (err) {
        errorLogger.error('useAIChat.saveMessage', 'Failed to save message', err);
        return false;
      }
    },
    [conversationId]
  );

  return {
    ...state,
    addMessage,
    updateLastMessage,
    saveMessage,
  };
}
