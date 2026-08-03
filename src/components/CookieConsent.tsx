import { useEffect } from 'react';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const STORAGE_KEY = 'truficient-cookie-consent';

export const getCookieConsent = (): CookiePreferences | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const savePreferences = (prefs: CookiePreferences) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: prefs }));
};

const CookieConsent = () => {
  useEffect(() => {
    if (getCookieConsent() === null) {
      savePreferences({ essential: true, analytics: true, marketing: true });
    }
  }, []);

  return null;
};

export default CookieConsent;
