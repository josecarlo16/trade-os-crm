/**
 * Utility functions for tracking conversions in Meta Pixel and Google Analytics
 */

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    gtag: (...args: any[]) => void;
  }
}

export type ConversionEvent = 
  | 'Lead'
  | 'Contact'
  | 'CompleteRegistration'
  | 'SubmitApplication'
  | 'Schedule';

interface ConversionData {
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
  [key: string]: any;
}

/**
 * Track a conversion event in both Meta Pixel and Google Analytics
 */
export const trackConversion = (
  event: ConversionEvent,
  data?: ConversionData
) => {
  // Track in Meta Pixel
  if (typeof window.fbq === 'function') {
    window.fbq('track', event, data);
    console.log(`[Meta Pixel] Tracked: ${event}`, data);
  }

  // Track in Google Analytics
  if (typeof window.gtag === 'function') {
    window.gtag('event', event.toLowerCase(), {
      event_category: 'conversion',
      event_label: data?.content_name || event,
      value: data?.value,
      ...data,
    });
    console.log(`[Google Analytics] Tracked: ${event}`, data);
  }
};

/**
 * Track a contact form submission
 */
export const trackContactFormSubmission = (serviceType?: string) => {
  trackConversion('Lead', {
    content_name: 'Contact Form',
    content_category: serviceType || 'General Inquiry',
  });
};

/**
 * Track an estimate calculator interaction
 */
export const trackEstimateCalculation = (estimateValue: number, serviceType: string) => {
  trackConversion('Lead', {
    content_name: 'HVAC Estimate Calculator',
    content_category: serviceType,
    value: estimateValue,
    currency: 'USD',
  });
};

/**
 * Track when user clicks to get an exact quote from the calculator
 */
export const trackGetQuoteClick = (estimateValue?: number) => {
  trackConversion('Lead', {
    content_name: 'Get Exact Quote Click',
    content_category: 'HVAC Estimate',
    value: estimateValue,
    currency: 'USD',
  });
};

/**
 * Track phone call clicks
 */
export const trackPhoneCallClick = (source: string) => {
  trackConversion('Contact', {
    content_name: 'Phone Call Click',
    content_category: source,
  });
};

/**
 * Track a job application submission
 */
export const trackJobApplicationSubmission = (position: string) => {
  trackConversion('SubmitApplication', {
    content_name: 'Job Application',
    content_category: position,
  });
};

/**
 * Track equipment scanner page view
 */
export const trackScannerPageView = () => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_title: 'Equipment Scanner',
      page_location: window.location.href,
      event_category: 'scanner',
    });
  }
};

/**
 * Track equipment scan started (zip code entered)
 */
export const trackScanStarted = (zipCode: string, isDFW: boolean) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'scan_started', {
      event_category: 'scanner',
      event_label: isDFW ? 'DFW Area' : 'Outside DFW',
      zip_code: zipCode,
    });
  }
  if (typeof window.fbq === 'function') {
    window.fbq('trackCustom', 'ScanStarted', { zip_code: zipCode, is_dfw: isDFW });
  }
};

/**
 * Track equipment scan completed
 */
export const trackScanCompleted = (brand: string | null, equipmentType: string | null) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'scan_completed', {
      event_category: 'scanner',
      event_label: brand || 'Unknown',
      equipment_type: equipmentType || 'Unknown',
    });
  }
  if (typeof window.fbq === 'function') {
    window.fbq('trackCustom', 'ScanCompleted', { brand, equipment_type: equipmentType });
  }
};

/**
 * Track email capture conversion (main conversion event)
 */
export const trackEmailCaptured = (scanCount: number, isDFW: boolean) => {
  trackConversion('Lead', {
    content_name: 'Equipment Scanner Email Capture',
    content_category: 'Equipment Scanner',
    value: scanCount,
  });
  
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'email_captured', {
      event_category: 'scanner',
      event_label: isDFW ? 'DFW Lead' : 'Non-DFW Lead',
      scan_count: scanCount,
    });
  }
};

/**
 * Track equipment report page view
 */
export const trackReportPageView = (scanCount: number) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'report_page_view', {
      event_category: 'scanner',
      event_label: 'Equipment Report Viewed',
      scan_count: scanCount,
    });
  }
};

/**
 * Track PDF download from report page
 */
export const trackPDFDownload = (scanCount: number) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'pdf_download', {
      event_category: 'scanner',
      event_label: 'Equipment Report PDF',
      scan_count: scanCount,
    });
  }
  if (typeof window.fbq === 'function') {
    window.fbq('trackCustom', 'PDFDownload', { scan_count: scanCount });
  }
};
