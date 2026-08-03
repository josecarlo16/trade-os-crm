import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: { tool: string; input: any; summary: string }[];
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
  hasConfirmation?: boolean;
  confirmationState?: 'pending' | 'confirmed' | 'cancelled';
  isBriefing?: boolean;
  suggestions?: string[];
}

interface AssistantContextType {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  sendMessage: (content: string, metadata?: any) => Promise<void>;
  clearConversation: () => void;
  confirmAction: (messageId: string, action: 'confirmed' | 'cancelled') => void;
  hasShownBriefing: boolean;
  setHasShownBriefing: (v: boolean) => void;
}

const AssistantContext = createContext<AssistantContextType | null>(null);

export const useAssistant = () => {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within AssistantProvider');
  return ctx;
};

// Detection: message has "?" and 2+ bold markers
function detectConfirmation(content: string): boolean {
  if (!content) return false;
  const hasBold = (content.match(/\*\*/g) || []).length >= 2;
  const hasQuestion = content.includes('?');
  return hasBold && hasQuestion;
}

export const AssistantProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownBriefing, setHasShownBriefing] = useState(false);

  const togglePanel = useCallback(() => setIsOpen(p => !p), []);
  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const clearConversation = useCallback(() => setMessages([]), []);

  const sendMessage = useCallback(async (content: string, metadata?: any) => {
    const isAutoBriefing = metadata?.auto_briefing === true;
    if (!isAutoBriefing && (!content.trim() || isLoading)) return;

    // For auto-briefing, don't show a user message bubble
    if (!isAutoBriefing) {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
    }

    const loadingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      isBriefing: isAutoBriefing,
    };

    setMessages(prev => [...prev, loadingMsg]);
    setIsLoading(true);

    try {
      const conversationHistory = isAutoBriefing ? [] : messages.slice(-20).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const body: any = {
        message: isAutoBriefing ? 'Generate my daily briefing.' : content.trim(),
        conversationHistory,
      };

      if (isAutoBriefing && metadata?.briefing_data) {
        body.briefing_data = metadata.briefing_data;
        body.is_auto_briefing = true;
      }

      if (metadata?.otto_context) {
        body.otto_context = metadata.otto_context;
      }

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const responseContent = data?.message || "Sorry, I couldn't generate a response.";
      const isConfirmation = detectConfirmation(responseContent);

      // Parse suggestions from response
      let suggestions: string[] | undefined;
      let cleanedContent = responseContent;
      const sugMatch = responseContent.match(/\[SUGGESTIONS:\s*(.+?)\]/);
      if (sugMatch) {
        try {
          suggestions = sugMatch[1].split(',').map((s: string) => s.trim().replace(/^"|"$/g, ''));
          cleanedContent = responseContent.replace(sugMatch[0], '').trim();
        } catch {}
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? {
                ...m,
                content: cleanedContent,
                toolsUsed: data?.toolsUsed,
                isLoading: false,
                hasConfirmation: isConfirmation,
                confirmationState: isConfirmation ? 'pending' : undefined,
                isBriefing: isAutoBriefing,
                suggestions,
              }
            : m
        )
      );
    } catch (err: any) {
      console.error('AI Assistant error:', err);
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? {
                ...m,
                content: err.message || 'Failed to get response. Please try again.',
                isLoading: false,
                isError: true,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const confirmAction = useCallback((messageId: string, action: 'confirmed' | 'cancelled') => {
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId ? { ...m, confirmationState: action } : m
      )
    );
    // Send the follow-up message
    const followUp = action === 'confirmed' ? 'Yes, confirmed' : 'Cancel that';
    sendMessage(followUp);
  }, [sendMessage]);

  return (
    <AssistantContext.Provider
      value={{ isOpen, messages, isLoading, togglePanel, openPanel, closePanel, sendMessage, clearConversation, confirmAction, hasShownBriefing, setHasShownBriefing }}
    >
      {children}
    </AssistantContext.Provider>
  );
};
