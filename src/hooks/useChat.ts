import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger, handleSupabaseError } from '@/lib/error-handling';

export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_email?: string;
}

export interface UseChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
}

/**
 * Improved chat hook with proper error handling
 */
export function useChat(
  table: 'chat_messages' | 'org_chat_messages' | 'alliance_chat_messages',
  filterId: string | undefined,
  appIdOrOrgId: string | undefined
) {
  const [state, setState] = useState<UseChatState>({
    messages: [],
    loading: true,
    error: null,
    sending: false,
  });

  // Load initial messages
  useEffect(() => {
    if (!appIdOrOrgId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const filterColumn = table === 'chat_messages' ? 'app_id' : 'org_id';

        const { data, error } = await (supabase
          .from(table as any)
          .select('*')
          .eq(filterColumn, appIdOrOrgId)
          .order('created_at', { ascending: true })
          .limit(100) as any);

        if (error) throw error;

        setState(prev => ({
          ...prev,
          messages: data || [],
          loading: false,
        }));
      } catch (err) {
        const userMessage = handleSupabaseError('useChat.load', err, {
          table,
          filterId: appIdOrOrgId,
        });
        setState(prev => ({
          ...prev,
          loading: false,
          error: userMessage,
        }));
      }
    })();
  }, [appIdOrOrgId, table]);

  // Subscribe to new messages
  useEffect(() => {
    if (!appIdOrOrgId) return;

    try {
      const filterColumn = table === 'chat_messages' ? 'app_id' : 'org_id';

      const channel = supabase
        .channel(`${table}-${appIdOrOrgId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table,
            filter: `${filterColumn}=eq.${appIdOrOrgId}`,
          },
          (payload) => {
            setState(prev => ({
              ...prev,
              messages: [...prev.messages, payload.new as ChatMessage],
            }));
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            errorLogger.info('useChat.subscribe', `Subscribed to ${table}`);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      errorLogger.error('useChat.subscribe', 'Failed to subscribe to messages', err, {
        table,
        filterId: appIdOrOrgId,
      });
    }
  }, [appIdOrOrgId, table]);

  const sendMessage = useCallback(
    async (content: string, userId: string) => {
      if (!appIdOrOrgId || !content.trim()) {
        errorLogger.warning('useChat.sendMessage', 'Missing required fields', {
          hasAppId: !!appIdOrOrgId,
          hasContent: !!content.trim(),
          hasUserId: !!userId,
        });
        return false;
      }

      try {
        setState(prev => ({ ...prev, sending: true, error: null }));

        const insertData: any = {
          content: content.trim(),
          user_id: userId,
        };

        if (table === 'chat_messages') {
          insertData.app_id = appIdOrOrgId;
        } else {
          insertData.org_id = appIdOrOrgId;
        }

        const { error } = await supabase.from(table).insert([insertData]);

        if (error) throw error;

        setState(prev => ({ ...prev, sending: false }));
        return true;
      } catch (err) {
        const userMessage = handleSupabaseError('useChat.sendMessage', err, {
          table,
          appIdOrOrgId,
          contentLength: content.length,
        });
        setState(prev => ({
          ...prev,
          sending: false,
          error: userMessage,
        }));
        return false;
      }
    },
    [appIdOrOrgId, table]
  );

  return {
    ...state,
    sendMessage,
  };
}
