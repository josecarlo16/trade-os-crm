import { useEffect } from 'react';

const FONT_LINK_ID = 'trade-os-fonts';

/**
 * Loads the Trade OS dashboard's Google Fonts (Barlow Condensed / Barlow /
 * IBM Plex Mono) once, on demand — kept out of index.html so the public
 * marketing site (served from the same index.html) doesn't pay for fonts
 * it never uses.
 */
export function useTradeOSFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.googleapis.com';
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap';
    document.head.appendChild(preconnect);
    document.head.appendChild(link);
  }, []);
}
