import { useState, useRef, useCallback, useEffect } from 'react';

const AUTO_SPEAK_KEY = 'bach-auto-speak';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    try { return localStorage.getItem(AUTO_SPEAK_KEY) === 'true'; } catch { return false; }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoadingAudio(false);
    setSpeakingMessageId(null);
  }, []);

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const speak = useCallback(async (text: string, messageId: string) => {
    // If already speaking this message, stop it
    if (speakingMessageId === messageId && isSpeaking) {
      stop();
      return;
    }

    // Stop any current playback
    stop();

    setIsLoadingAudio(true);
    setSpeakingMessageId(messageId);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Get session token for auth
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || supabaseKey;

      const response = await fetch(`${supabaseUrl}/functions/v1/text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      blobUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        setIsLoadingAudio(false);
      };

      audio.onended = () => {
        cleanup();
      };

      audio.onerror = () => {
        cleanup();
      };

      await audio.play();
    } catch (err) {
      console.error('TTS playback error:', err);
      cleanup();
    }
  }, [speakingMessageId, isSpeaking, stop, cleanup]);

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak(prev => {
      const next = !prev;
      try { localStorage.setItem(AUTO_SPEAK_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return {
    speak,
    stop,
    isSpeaking,
    isLoadingAudio,
    speakingMessageId,
    autoSpeak,
    toggleAutoSpeak,
  };
}
