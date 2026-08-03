import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import truficientLogo from "@/assets/truficient-logo.png";

// Label mappings
const HOME_TYPE_LABELS: Record<string, string> = {
  single_family: "Single Family Home",
  townhouse: "Townhouse",
  condo: "Condo",
  mobile_home: "Mobile Home",
  duplex: "Duplex",
  other: "Other",
};

const HOME_LAYOUT_LABELS: Record<string, string> = {
  "1_story": "1 Story",
  "2_stories": "2 Stories",
  "3_stories": "3+ Stories",
  split_level: "Split Level",
  basement: "With Basement",
  loft: "With Loft",
};

const HEATING_TYPE_LABELS: Record<string, string> = {
  gas_system: "Gas Furnace + AC",
  heat_pump: "Heat Pump System",
};

const INSULATION_LABELS: Record<string, string> = {
  high: "Well Insulated",
  medium: "Standard",
  low: "Poor Insulation",
  not_sure: "Not Sure",
};

const WINDOW_LABELS: Record<string, string> = {
  triple_pane: "Triple Pane",
  double_pane: "Double Pane",
  single_pane: "Single Pane",
  mixed: "Mixed",
};

const HOME_AGE_LABELS: Record<string, string> = {
  after_2010: "Built After 2010",
  "2000_2010": "2000-2010",
  "1980_2000": "1980-2000",
  before_1980: "Before 1980",
};

const SQFT_LABELS: Record<string, string> = {
  under_800: "Under 800 sq ft",
  "800_1200": "800-1,200 sq ft",
  "1200_1600": "1,200-1,600 sq ft",
  "1600_2000": "1,600-2,000 sq ft",
  "2000_2500": "2,000-2,500 sq ft",
  "2500_3000": "2,500-3,000 sq ft",
  "3000_3500": "3,000-3,500 sq ft",
  "3500_4000": "3,500-4,000 sq ft",
  "4000_plus": "4,000+ sq ft",
};

const COVERAGE_LABELS: Record<string, string> = {
  whole_home: "Whole Home",
  partial: "Partial Coverage",
};

const HOT_COLD_LABELS: Record<string, string> = {
  none: "No Issues",
  few: "A Few Areas",
  many: "Multiple Rooms",
  not_sure: "Not Sure",
};

const TEMP_PREF_LABELS: Record<string, string> = {
  very_warm: "Very Warm (74°+)",
  warm: "Warm (72-74°)",
  moderate: "Moderate (68-72°)",
  cool: "Cool (65-68°)",
  very_cool: "Very Cool (Below 65°)",
};

interface FinancingOption {
  id: string;
  plan_name: string;
  promotional_offer: string;
  interest_rate: number;
  payment_factor: number;
  months_to_payoff: number | null;
  sort_order: number;
}

export interface DuctedQuotePDFData {
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    formattedAddress?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  homeType: string | null;
  homeLayout: string | null;
  squareFootage: string | null;
  systemCount: number;
  coverage: string | null;
  atticInsulation: string | null;
  windowType: string | null;
  homeAge: string | null;
  hotColdSpots?: string | null;
  winterTemp?: string | null;
  summerTemp?: string | null;
  heatingType: string | null;
  selectedTonnage: number | null;
  equipment: {
    brand: string;
    systemName: string | null;
    seer2Rating: number | null;
    hspf2Rating: number | null;
    warrantyYears: number;
  } | null;
  tier: {
    displayName: string;
  } | null;
  addonsBreakdown: Array<{ name: string; price: number }>;
  pricing: {
    equipmentCost: number;
    installationCost: number;
    addonsCost: number;
    finalTotal: number;
    monthlyFinancing: number;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Fetch financing options from database
async function fetchFinancingOptions(): Promise<FinancingOption[]> {
  const { data, error } = await supabase
    .from("financing_options")
    .select("id, plan_name, promotional_offer, interest_rate, payment_factor, months_to_payoff, sort_order")
    .eq("is_active", true)
    .contains("applies_to", ["ducted"])
    .order("sort_order");

  if (error) {
    console.error("Error fetching financing options:", error);
    return [];
  }

  return data || [];
}

// Convert image URL to base64 for embedding in HTML
async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

export async function generateDuctedQuotePDF(data: DuctedQuotePDFData): Promise<void> {
  const generatedDate = format(new Date(), "MMMM d, yyyy");
  const validUntilDate = format(addDays(new Date(), 30), "MMMM d, yyyy");
  
  // Fetch financing options and logo in parallel
  const [financingOptions, logoBase64] = await Promise.all([
    fetchFinancingOptions(),
    imageToBase64(truficientLogo)
  ]);

  // Build address from separate fields if available, otherwise fall back to formattedAddress/address
  const buildAddress = (): string => {
    const { streetAddress, city, state, zipCode, formattedAddress, address } = data.customerInfo;
    
    // Try building from separate components first
    if (streetAddress?.trim() && city?.trim() && zipCode?.trim()) {
      return `${streetAddress.trim()}, ${city.trim()}, ${state || 'TX'} ${zipCode.trim()}`;
    }
    
    // Fall back to existing address fields
    return formattedAddress || address || "Not provided";
  };

  const customerAddress = buildAddress();

  // Calculate financing for each option
  const financingCalculations = financingOptions.map(opt => ({
    ...opt,
    monthlyPayment: Math.round(data.pricing.finalTotal * opt.payment_factor)
  }));

  // Check if any deferred interest plans exist
  const hasDeferredInterest = financingOptions.some(
    opt => opt.plan_name.includes("920") || opt.plan_name.includes("924")
  );

  // Build financing HTML
  const financingHTML = financingCalculations.length > 0 ? `
    <div class="section financing-section">
      <div class="section-title">Financing Options</div>
      <p class="financing-total">Your Total: <strong>${formatCurrency(data.pricing.finalTotal)}</strong></p>
      
      <div class="financing-grid">
        ${financingCalculations.map(opt => `
          <div class="financing-option">
            <div class="financing-plan-name">${opt.plan_name} - ${opt.promotional_offer}</div>
            <div class="financing-details">
              Monthly Payment: <strong>~${formatCurrency(opt.monthlyPayment)}/mo</strong>
              ${opt.months_to_payoff ? ` | Term: ${opt.months_to_payoff} months` : ""}
              ${opt.interest_rate > 0 ? ` | APR: ${opt.interest_rate}%` : ""}
            </div>
          </div>
        `).join("")}
      </div>
      
      <div class="financing-disclaimer">
        *Subject to credit approval. Minimum monthly payments required. Financing provided by Synchrony Bank.
      </div>
      
      ${hasDeferredInterest ? `
        <div class="deferred-disclaimer">
          For deferred interest promotions: No interest will be charged on this purchase if you pay the promotional balance in full within the promotional period. Interest will be charged from the purchase date if not paid in full.
        </div>
      ` : ""}
    </div>
  ` : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>HVAC System Estimate - Truficient</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1e3a5f;
          line-height: 1.5;
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #1e3a5f;
          padding-bottom: 16px;
          margin-bottom: 16px;
        }
        .logo {
          max-width: 240px;
          height: auto;
          margin-bottom: 8px;
        }
        .header-subtitle {
          font-size: 16px;
          font-weight: 600;
          color: #1e3a5f;
          letter-spacing: 1px;
        }
        .meta-info {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #666;
          margin-bottom: 16px;
        }
        .section {
          margin-bottom: 20px;
          break-inside: avoid;
        }
        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #1e3a5f;
          background: #f0f4f8;
          padding: 6px 12px;
          border-radius: 4px;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 24px;
          font-size: 12px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
        }
        .info-label {
          color: #666;
        }
        .info-value {
          font-weight: 500;
          color: #1e3a5f;
          text-align: right;
        }
        .pricing-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .pricing-table th {
          text-align: left;
          padding: 6px 10px;
          background: #f0f4f8;
          color: #1e3a5f;
          font-weight: 600;
        }
        .pricing-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        .pricing-table .amount {
          text-align: right;
          font-weight: 500;
        }
        .subtotal-row {
          background: #f9fafb;
        }
        .tax-row td {
          font-size: 11px;
          color: #666;
        }
        .total-row {
          background: #1e3a5f;
          color: white;
        }
        .total-row td {
          padding: 10px;
          font-size: 14px;
          font-weight: bold;
          border-bottom: none;
        }
        
        /* Financing Section */
        .financing-section {
          background: #fafbfc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }
        .financing-section .section-title {
          background: #1e3a5f;
          color: white;
        }
        .financing-total {
          font-size: 14px;
          margin-bottom: 12px;
          color: #1e3a5f;
        }
        .financing-grid {
          display: grid;
          gap: 10px;
        }
        .financing-option {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 10px 12px;
        }
        .financing-plan-name {
          font-weight: 600;
          color: #1e3a5f;
          font-size: 12px;
          margin-bottom: 4px;
        }
        .financing-details {
          font-size: 11px;
          color: #666;
        }
        .financing-disclaimer {
          font-size: 10px;
          color: #666;
          font-style: italic;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }
        .deferred-disclaimer {
          font-size: 10px;
          color: #92400e;
          background: #fef3c7;
          padding: 8px;
          border-radius: 4px;
          margin-top: 8px;
        }
        
        /* Next Steps */
        .steps-list {
          font-size: 12px;
        }
        .step-item {
          margin-bottom: 10px;
          padding-left: 0;
        }
        .step-number {
          display: inline-block;
          width: 20px;
          height: 20px;
          background: #1e3a5f;
          color: white;
          border-radius: 50%;
          text-align: center;
          line-height: 20px;
          font-size: 11px;
          font-weight: 600;
          margin-right: 8px;
        }
        .step-title {
          font-weight: 600;
          color: #1e3a5f;
        }
        .step-desc {
          color: #666;
          margin-left: 28px;
          margin-top: 2px;
        }
        
        .included-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          font-size: 11px;
        }
        .included-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .checkmark {
          color: #22c55e;
          font-weight: bold;
        }
        .footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 2px solid #1e3a5f;
          text-align: center;
        }
        .contact-info {
          font-size: 14px;
          color: #1e3a5f;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .contact-info a {
          color: #0066cc;
          text-decoration: none;
        }
        .contact-info a:hover {
          text-decoration: underline;
        }
        .license-info {
          font-size: 11px;
          color: #666;
          margin-top: 8px;
        }
        .disclaimer {
          font-size: 10px;
          color: #999;
          margin-top: 8px;
        }
        .valid-until {
          background: #fef3c7;
          padding: 6px 16px;
          border-radius: 4px;
          font-size: 11px;
          text-align: center;
          color: #92400e;
          margin-bottom: 16px;
          display: inline-block;
          width: 100%;
        }
        @media print {
          body { padding: 12px; }
          .section { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Truficient HVAC" class="logo" />` : `<div style="font-size: 28px; font-weight: bold; color: #1e3a5f;">TRUFICIENT HVAC</div>`}
        <div class="header-subtitle">HVAC SYSTEM ESTIMATE</div>
      </div>

      <div class="meta-info">
        <span>Date Generated: ${generatedDate}</span>
        <span>Estimate Valid Until: ${validUntilDate}</span>
      </div>

      <div class="valid-until">
        ⏰ This estimate is valid until <strong>${validUntilDate}</strong>
      </div>

      <div class="section">
        <div class="section-title">Customer Information</div>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Name</span>
            <span class="info-value">${data.customerInfo.name || "Not provided"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone</span>
            <span class="info-value">${data.customerInfo.phone || "Not provided"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email</span>
            <span class="info-value">${data.customerInfo.email || "Not provided"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Address</span>
            <span class="info-value">${customerAddress}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Home Details</div>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Home Type</span>
            <span class="info-value">${data.homeType ? HOME_TYPE_LABELS[data.homeType] || data.homeType : "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Layout</span>
            <span class="info-value">${data.homeLayout ? HOME_LAYOUT_LABELS[data.homeLayout] || data.homeLayout : "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Square Footage</span>
            <span class="info-value">${data.squareFootage ? SQFT_LABELS[data.squareFootage] || data.squareFootage : "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Coverage</span>
            <span class="info-value">${data.coverage ? COVERAGE_LABELS[data.coverage] || data.coverage : "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">System Count</span>
            <span class="info-value">${data.systemCount} System${data.systemCount > 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Efficiency Factors</div>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Attic Insulation</span>
            <span class="info-value">${data.atticInsulation ? INSULATION_LABELS[data.atticInsulation] || data.atticInsulation : "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Window Type</span>
            <span class="info-value">${data.windowType ? WINDOW_LABELS[data.windowType] || data.windowType : "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Home Age</span>
            <span class="info-value">${data.homeAge ? HOME_AGE_LABELS[data.homeAge] || data.homeAge : "—"}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Comfort Preferences</div>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Hot/Cold Spots</span>
            <span class="info-value">${data.hotColdSpots ? HOT_COLD_LABELS[data.hotColdSpots] || data.hotColdSpots : "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Winter Setting</span>
            <span class="info-value">${data.winterTemp ? TEMP_PREF_LABELS[data.winterTemp] || data.winterTemp : "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Summer Setting</span>
            <span class="info-value">${data.summerTemp ? TEMP_PREF_LABELS[data.summerTemp] || data.summerTemp : "—"}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">System Configuration</div>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Heating Type</span>
            <span class="info-value">${data.heatingType ? HEATING_TYPE_LABELS[data.heatingType] || data.heatingType : "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">System Size</span>
            <span class="info-value">${data.selectedTonnage ? `${data.selectedTonnage} Ton` : "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Efficiency Tier</span>
            <span class="info-value">${data.tier?.displayName || "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Brand</span>
            <span class="info-value">${data.equipment?.brand || "—"}</span>
          </div>
          ${data.equipment?.systemName ? `
          <div class="info-row">
            <span class="info-label">Model</span>
            <span class="info-value">${data.equipment.systemName}</span>
          </div>
          ` : ""}
          ${data.equipment?.seer2Rating ? `
          <div class="info-row">
            <span class="info-label">SEER2 Rating</span>
            <span class="info-value">${data.equipment.seer2Rating}</span>
          </div>
          ` : ""}
          ${data.equipment?.hspf2Rating ? `
          <div class="info-row">
            <span class="info-label">HSPF2 Rating</span>
            <span class="info-value">${data.equipment.hspf2Rating}</span>
          </div>
          ` : ""}
          <div class="info-row">
            <span class="info-label">Warranty</span>
            <span class="info-value">${data.equipment?.warrantyYears ? `${data.equipment.warrantyYears} Years` : "—"}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Pricing Breakdown</div>
        <table class="pricing-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Equipment + Install${data.equipment?.brand === 'Goodman' ? ' <span style="color: #16a34a; font-size: 10px; font-weight: 600;">(March Group Buy · 20% Off)</span>' : ''}</td>
              <td class="amount">${formatCurrency(data.pricing.equipmentCost + data.pricing.installationCost)}</td>
            </tr>
            ${data.addonsBreakdown.map(addon => `
            <tr>
              <td style="padding-left: 20px; font-size: 11px;">• ${addon.name}</td>
              <td class="amount">${formatCurrency(addon.price)}</td>
            </tr>
            `).join("")}
            <tr class="total-row">
              <td>TOTAL INVESTMENT</td>
              <td class="amount">${formatCurrency(data.pricing.finalTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${financingHTML}

      <div class="section">
        <div class="section-title">What's Included</div>
        <div class="included-list">
          <div class="included-item"><span class="checkmark">✓</span> Professional Installation</div>
          <div class="included-item"><span class="checkmark">✓</span> Premium Equipment Package</div>
          <div class="included-item"><span class="checkmark">✓</span> Smart Thermostat</div>
          <div class="included-item"><span class="checkmark">✓</span> Removal & Disposal of Old System</div>
          <div class="included-item"><span class="checkmark">✓</span> All Permits & Inspections</div>
          <div class="included-item"><span class="checkmark">✓</span> 1-Year Labor Warranty</div>
          <div class="included-item"><span class="checkmark">✓</span> System Commissioning</div>
          <div class="included-item"><span class="checkmark">✓</span> Customer Training</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Next Steps</div>
        <div class="steps-list">
          <div class="step-item">
            <span class="step-number">1</span>
            <span class="step-title">Expert Quote Review</span>
            <div class="step-desc">Our team is reviewing your request to ensure every detail is accurate and tailored to your home's specific needs.</div>
          </div>
          <div class="step-item">
            <span class="step-number">2</span>
            <span class="step-title">Personal Consultation</span>
            <div class="step-desc">A Comfort Advisor will call you within one business day to walk through your quote, answer technical questions, and discuss financing if needed.</div>
          </div>
          <div class="step-item">
            <span class="step-number">3</span>
            <span class="step-title">Technical Site Assessment</span>
            <div class="step-desc">We'll perform an on-site visit to verify equipment sizing and installation requirements.</div>
          </div>
          <div class="step-item">
            <span class="step-number">4</span>
            <span class="step-title">Precision Installation</span>
            <div class="step-desc">Our trained team will install your new system with surgical care, adhering to all local codes and manufacturer specifications.</div>
          </div>
          <div class="step-item">
            <span class="step-number">5</span>
            <span class="step-title">Performance Optimization</span>
            <div class="step-desc">After installation, we conduct a rigorous post-install test and calibrate the system for peak efficiency.</div>
          </div>
          <div class="step-item">
            <span class="step-number">6</span>
            <span class="step-title">Warranty & Final Paperwork</span>
            <div class="step-desc">We'll register your equipment to secure your 10-12 year parts warranty and provide a full digital report of your system's performance.</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div class="contact-info">
          📞 (214) 238-4349 &nbsp;|&nbsp; ✉ info@truficient.com &nbsp;|&nbsp; 🌐 <a href="https://truficient.com" target="_blank">truficient.com</a>
        </div>
        <div class="license-info">
          License: TACLB77247C • Mitsubishi Diamond Contractor • Serving Dallas-Fort Worth
        </div>
        <div class="disclaimer">
          This is an estimate based on the information provided. Final pricing may vary based on in-home assessment.
        </div>
      </div>
    </body>
    </html>
  `;

  // Open new window and print
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content and images to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}
