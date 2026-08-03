import { useRef, useEffect, useState, useCallback } from 'react';
import { Minus, Trash2, Send, Mic, MicOff, Zap, Volume2, VolumeX } from 'lucide-react';
import { useAssistant } from './AssistantContext';
import { ChatMessage } from './ChatMessage';
import { QuickPrompts } from './QuickPrompts';
import { VoiceWaveform } from './VoiceWaveform';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

interface AIAssistantPanelProps {
  enableVoice?: boolean;
  briefingData?: any;
}

export const AIAssistantPanel = ({ enableVoice = true, briefingData }: AIAssistantPanelProps) => {
  const { isOpen, messages, isLoading, closePanel, sendMessage, clearConversation, confirmAction, hasShownBriefing, setHasShownBriefing } = useAssistant();
  const tts = useTextToSpeech();
  const [input, setInput] = useState('');
  const [sendCooldown, setSendCooldown] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const prevMessagesLenRef = useRef(messages.length);
  // Speech recognition setup
  const initRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'Not supported', description: 'Speech recognition is not supported in this browser.', variant: 'destructive' });
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText('');
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        setInterimText('');
        if (transcript) {
          // Auto-send on final transcript
          isListeningRef.current = false;
          setIsListening(false);
          sendMessage(transcript);
        }
      } else {
        setInterimText(result[0].transcript);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;
      setInterimText('');
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        toast({ title: 'Mic blocked', description: 'Please allow microphone access.', variant: 'destructive' });
      } else if (event.error !== 'no-speech') {
        toast({ title: 'Voice error', description: `Speech error: ${event.error}`, variant: 'destructive' });
      }
      isListeningRef.current = false;
      setIsListening(false);
      setInterimText('');
    };

    return recognition;
  }, [toast, sendMessage]);

  const handleMicToggle = useCallback(() => {
    if (isListeningRef.current) {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimText('');
    } else {
      tts.stop(); // Stop TTS when starting mic
      recognitionRef.current = initRecognition();
      if (recognitionRef.current) {
        isListeningRef.current = true;
        setIsListening(true);
        recognitionRef.current.start();
      }
    }
  }, [initRecognition]);

  // Keyboard shortcut: Ctrl+Shift+V to toggle voice
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        handleMicToggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMicToggle]);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closePanel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, closePanel]);

  // Stop TTS when panel closes
  useEffect(() => {
    if (!isOpen) tts.stop();
  }, [isOpen, tts.stop]);

  // Auto-speak new assistant messages
  useEffect(() => {
    if (!tts.autoSpeak) {
      prevMessagesLenRef.current = messages.length;
      return;
    }
    if (messages.length > prevMessagesLenRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && !lastMsg.isLoading && !lastMsg.isError && lastMsg.content) {
        tts.speak(lastMsg.content, lastMsg.id);
      }
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages, tts.autoSpeak]);

  // Auto-briefing on first open
  useEffect(() => {
    if (isOpen && !hasShownBriefing && briefingData && messages.length === 0) {
      setHasShownBriefing(true);
      sendMessage("__AUTO_BRIEFING__", {
        auto_briefing: true,
        briefing_data: briefingData,
      });
    }
  }, [isOpen, hasShownBriefing, briefingData, messages.length, sendMessage, setHasShownBriefing]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || sendCooldown) return;
    // Stop TTS when sending
    tts.stop();
    if (isListeningRef.current) {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimText('');
    }
    const text = input;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setSendCooldown(true);
    setTimeout(() => setSendCooldown(false), 1000);
    await sendMessage(text);
  }, [input, isLoading, sendCooldown, sendMessage, tts.stop]);

  const handleClear = () => {
    toast({ title: 'Chat cleared', description: 'Conversation history has been reset.' });
    clearConversation();
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  // Find last assistant message index
  const lastAssistantIdx = messages.reduceRight((found, m, i) => {
    if (found >= 0) return found;
    return m.role === 'assistant' && !m.isLoading ? i : -1;
  }, -1);

  // Check if there's a pending confirmation
  const hasPendingConfirmation = lastAssistantIdx >= 0 && messages[lastAssistantIdx]?.confirmationState === 'pending';

  return (
    <div
      className={`fixed z-[45] flex flex-col bg-white transition-transform duration-300 ease-out
        ${isMobile ? 'inset-0' : 'top-12 right-0 w-[400px] h-[calc(100vh-48px)] border-l border-gray-200'}
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        shadow-[-4px_0_12px_rgba(0,0,0,0.1)]`}
    >
      {/* Voice listening bar */}
      {isListening && (
        <div
          className="shrink-0 bg-red-500 text-white text-xs font-medium px-4 py-2 flex items-center gap-2 cursor-pointer"
          onClick={handleMicToggle}
          role="button"
          aria-label="Stop listening"
        >
          <VoiceWaveform />
          <span>Listening... speak your command</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 bg-[#1B2A4A] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">🎵</span>
          <span className="text-white font-semibold text-sm">Bach Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={tts.toggleAutoSpeak}
            className={`p-1.5 rounded hover:bg-white/10 transition-colors ${tts.autoSpeak ? 'bg-white/15' : ''}`}
            title={tts.autoSpeak ? 'Auto-speak on' : 'Auto-speak off'}
          >
            {tts.autoSpeak ? (
              <Volume2 className="h-4 w-4 text-[#C4A962]" />
            ) : (
              <VolumeX className="h-4 w-4 text-[#C4A962]/50" />
            )}
          </button>
          {messages.length > 0 && (
            <button onClick={handleClear} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Clear chat">
              <Trash2 className="h-4 w-4 text-[#C4A962]" />
            </button>
          )}
          <button onClick={closePanel} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Minimize">
            <Minus className="h-4 w-4 text-[#C4A962]" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <QuickPrompts onSelect={handleQuickPrompt} />
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLatestAssistant={idx === lastAssistantIdx}
                onConfirm={() => confirmAction(msg.id, 'confirmed')}
                onCancel={() => confirmAction(msg.id, 'cancelled')}
                onSendMessage={handleQuickPrompt}
                onSpeak={tts.speak}
                isSpeakingThis={tts.speakingMessageId === msg.id && tts.isSpeaking}
                isLoadingAudio={tts.speakingMessageId === msg.id && tts.isLoadingAudio}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pending confirmation bar */}
      {hasPendingConfirmation && !isListening && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-amber-700" />
          <span className="text-xs text-amber-700 font-medium">Awaiting your confirmation above...</span>
        </div>
      )}

      {/* Interim text preview */}
      {isListening && interimText && (
        <div className="shrink-0 px-4 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-400 italic">"{interimText}"</p>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-3 pb-5">
        <div className="flex items-end gap-2">
          {enableVoice && (
            <button
              onClick={handleMicToggle}
              disabled={isLoading}
              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
              }`}
              style={isListening ? { animation: 'voice-pulse 1.5s ease-in-out infinite' } : undefined}
              title={isListening ? 'Stop listening' : 'Voice input (Ctrl+Shift+V)'}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
            rows={6}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A] max-h-[280px] min-h-[120px]"
            
            onInput={e => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 280) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || sendCooldown || isListening}
            className="shrink-0 w-9 h-9 rounded-full bg-[#1B2A4A] flex items-center justify-center disabled:opacity-40 transition-opacity hover:opacity-90"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Voice pulse animation */}
      <style>{`
        @keyframes voice-pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
};
