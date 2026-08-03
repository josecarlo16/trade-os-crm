import { MessageSquare, X } from 'lucide-react';
import { useAssistant } from './AssistantContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface AssistantToggleProps {
  badgeCount?: number;
}

export const AssistantToggle = ({ badgeCount = 0 }: AssistantToggleProps) => {
  const { isOpen, togglePanel } = useAssistant();
  const isMobile = useIsMobile();

  return (
    <button
      onClick={togglePanel}
      className={`fixed z-50 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center
        ${isMobile ? 'w-12 h-12 bottom-44 right-5' : 'w-14 h-14 bottom-48 right-6'}
        bg-[#1B2A4A] hover:scale-105 hover:shadow-xl`}
      aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
    >
      {isOpen ? (
        <X className="h-6 w-6 text-[#C4A962]" />
      ) : (
        <>
          <MessageSquare className="h-6 w-6 text-[#C4A962]" />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </>
      )}
    </button>
  );
};
