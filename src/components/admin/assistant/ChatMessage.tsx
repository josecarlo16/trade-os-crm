import { useState } from 'react';
import DOMPurify from 'dompurify';
import { ChevronDown, ChevronUp, AlertCircle, RotateCcw, CheckCircle2, Calendar, RefreshCw, XCircle, Sparkles, Volume2, VolumeX, Loader2 } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from './AssistantContext';
import { ConfirmationCard } from './ConfirmationCard';

interface ChatMessageProps {
  message: ChatMessageType;
  isLatestAssistant?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onSendMessage?: (msg: string) => void;
  onSpeak?: (text: string, messageId: string) => void;
  isSpeakingThis?: boolean;
  isLoadingAudio?: boolean;
}

const SUCCESS_KEYWORDS = ['Created job', 'Moved', 'Logged', 'Updated', 'Added', 'Scheduled', 'Rescheduled', 'Cancelled'];

const CALENDAR_LINK_REGEX = /https:\/\/(www\.google\.com\/calendar\/event\?eid=|calendar\.google\.com\/calendar\/event\?eid=)[^\s)]+/g;

export const ChatMessage = ({ message, isLatestAssistant, onConfirm, onCancel, onRetry, onSendMessage, onSpeak, isSpeakingThis, isLoadingAudio }: ChatMessageProps) => {
  const [showTools, setShowTools] = useState(false);

  // Loading state
  if (message.isLoading) {
    return (
      <div className="flex justify-start">
        <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[85%]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (message.isError) {
    return (
      <div className="flex justify-start">
        <div className="bg-red-50 border border-red-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[85%]">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-700">{message.content}</p>
              {onRetry && (
                <button onClick={onRetry} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 mt-1.5 font-medium">
                  <RotateCcw className="h-3 w-3" /> Retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isUser = message.role === 'user';
  const isSuccess = !isUser && SUCCESS_KEYWORDS.some(kw => message.content.startsWith(kw) || message.content.includes(`✅ ${kw}`) || message.content.includes(kw));
  const isReschedule = !isUser && (message.content.includes('Reschedul') || message.content.includes('reschedul'));
  const isCancellation = !isUser && (message.content.includes('Cancel') || message.content.includes('cancel'));
  const hasCalendarSynced = !isUser && message.content.includes('calendar updated');

  // Extract calendar links from message
  const calendarLinks = !isUser ? (message.content.match(CALENDAR_LINK_REGEX) || []) : [];

  // Format assistant content (strip calendar links from inline text)
  const formatContent = (text: string) => {
    let cleaned = text;
    calendarLinks.forEach(link => {
      cleaned = cleaned.replace(link, '');
    });

    return cleaned.split('\n').map((line, i) => {
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const sanitize = (html: string) => DOMPurify.sanitize(html, { ALLOWED_TAGS: ['strong', 'em', 'br'] });
      if (/^[📞📧📍🏠📅💰🔧👷⚠️✅🔗🔄❌]/.test(line)) {
        return <p key={i} className="text-sm my-0.5" dangerouslySetInnerHTML={{ __html: sanitize(formatted) }} />;
      }
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <p key={i} className="text-sm pl-3 my-0.5" dangerouslySetInnerHTML={{ __html: sanitize(`• ${formatted.slice(2)}`) }} />;
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="text-sm my-0.5" dangerouslySetInnerHTML={{ __html: sanitize(formatted) }} />;
    });
  };

  const timeStr = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const showConfirmationCard = message.hasConfirmation && !isUser;
  const isConfirmationInteractive = isLatestAssistant && message.confirmationState === 'pending';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%]">
        <div
          className={`px-3.5 py-2.5 ${
            isUser
              ? 'bg-[#1B2A4A] text-white rounded-2xl rounded-br-sm'
              : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm'
          }`}
        >
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <div>
              {message.isBriefing && (
                <div className="flex items-center gap-2 mb-2 text-xs text-amber-600 font-medium">
                  <Sparkles className="w-3 h-3" />
                  <span>Daily Briefing</span>
                  <span className="text-gray-400">
                    {message.timestamp.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "America/Chicago" })}
                  </span>
                </div>
              )}
              {isSuccess && !message.isBriefing && (
                <div className="flex items-center gap-1 mb-1">
                  {isReschedule ? (
                    <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                  ) : isCancellation ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  )}
                </div>
              )}
              {formatContent(message.content)}

              {/* Calendar links */}
              {calendarLinks.length > 0 && (
                <div className="mt-2 space-y-1">
                  {calendarLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1 py-1.5 px-3 bg-white border border-gray-200 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      View in Google Calendar →
                    </a>
                  ))}
                </div>
              )}

              {/* Calendar synced badge */}
              {hasCalendarSynced && calendarLinks.length === 0 && (
                <div className="inline-flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" /> synced
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suggestion chips after briefing */}
        {message.isBriefing && message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSendMessage?.(suggestion)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Confirmation card */}
        {showConfirmationCard && (
          <ConfirmationCard
            onConfirm={onConfirm || (() => {})}
            onCancel={onCancel || (() => {})}
            disabled={!isConfirmationInteractive}
            action={message.confirmationState !== 'pending' ? message.confirmationState : undefined}
          />
        )}

        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-400">{timeStr}</span>
          {!isUser && onSpeak && (
            <button
              onClick={() => onSpeak(message.content, message.id)}
              disabled={isLoadingAudio}
              className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40"
              title={isSpeakingThis ? 'Stop speaking' : 'Listen'}
            >
              {isLoadingAudio ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isSpeakingThis ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </button>
          )}
          {!isUser && message.toolsUsed && message.toolsUsed.length > 0 && (
            <button
              onClick={() => setShowTools(p => !p)}
              className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600"
            >
              {message.toolsUsed.length} tool{message.toolsUsed.length > 1 ? 's' : ''} used
              {showTools ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>

        {showTools && message.toolsUsed && (
          <div className="mt-1 px-2 py-1.5 bg-gray-50 rounded text-xs text-gray-500 space-y-0.5">
            {message.toolsUsed.map((t, i) => (
              <div key={i}>🔧 {t.summary}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
