import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import truficientLogo from "@/assets/truficient-logo.png";

interface FinancingOption {
  id: string;
  plan_name: string;
  promotional_offer: string;
  interest_rate: number;
  payment_factor: number;
  months_to_payoff: number | null;
  sort_order: number;
}

interface RoomData {
  id: string;
  label: string;
  roomType: string;
  size: string;
  recommendedBtu: number;
  unitTypeName?: string;
}

interface AddonData {
  id: string;
  name: string;
  price: number;
  priceType: string;
  total: number;
}

interface CustomerInfoData {
  name: string;
  email: string;
  phone: string;
  address?: string;
  formattedAddress?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface PricingData {
  zoneCount: number;
  totalBtu: number;
  baseEquipmentCost: number;
  equipmentTotal: number;
  tierMultiplier: number;
  addonsTotal: number;
  addonsBreakdown: AddonData[];
  subtotal: number;
  taxAmount: number;
  rebates: number;
  finalTotal: number;
}

export interface DuctlessQuotePDFData {
  customerInfo: CustomerInfoData;
  rooms: RoomData[];
  tierName: string;
  pricing: PricingData;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Fetch financing options from database
async function fetchFinancingOptions(): Promise<FinancingOption[]> {
  const { data, error } = await supabase
    .from("financing_options")
    .select("id, plan_name, promotional_offer, interest_rate, payment_factor, months_to_payoff, sort_order")
    .eq("is_active", true)
    .contains("applies_to", ["ductless"])
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

export async function generateDuctlessQuotePDF(data: DuctlessQuotePDFData): Promise<void> {
  const generatedDate = format(new Date(), "MMMM d, yyyy");
  const validUntilDate = format(addDays(new Date(), 30), "MMMM d, yyyy");
  
  // Fetch financing options and logo in parallel
  const [financingOptions, logoBase64] = await Promise.all([
    fetchFinancingOptions(),
    imageToBase64(truficientLogo)
  ]);

  // Build address from separate fields if available
  const buildAddress = (): string => {
    const { streetAddress, city, state, zipCode, formattedAddress, address } = data.customerInfo;
    
    if (streetAddress?.trim() && city?.trim() && zipCode?.trim()) {
      return `${streetAddress.trim()}, ${city.trim()}, ${state || 'TX'} ${zipCode.trim()}`;
    }
    
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

  // Build rooms list HTML
  const roomsHTML = data.rooms.map(room => `
    <tr>
      <td class="room-name">${room.label}</td>
      <td class="room-btu">${room.recommendedBtu.toLocaleString()} BTU</td>
      <td class="room-unit">${room.unitTypeName || "Wall Mount"}</td>
    </tr>
  `).join("");

  // Build addons HTML
  const addonsHTML = data.pricing.addonsBreakdown.length > 0 ? `
    <div class="addons-section">
      <h4>Selected Add-ons</h4>
      ${data.pricing.addonsBreakdown.map(addon => `
        <div class="addon-row">
          <span>${addon.name}${addon.priceType === "per_zone" ? ` (${formatCurrency(addon.price)} × ${data.pricing.zoneCount} zones)` : ""}</span>
          <span>${formatCurrency(addon.total)}</span>
        </div>
      `).join("")}
    </div>
  ` : "";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ductless Mini-Split Estimate - ${data.customerInfo.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: 11px; 
      line-height: 1.5; 
      color: #1e3a5f; 
      background: white;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 30px 40px; }
    
    /* Header */
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
      padding-bottom: 20px; 
      border-bottom: 3px solid #a5a983; 
    }
    .logo { max-width: 120px; height: auto; margin-bottom: 10px; border-radius: 8px; }
    .company-name { font-size: 24px; font-weight: bold; color: #1e3a5f; margin-bottom: 5px; }
    .doc-title { font-size: 18px; color: #a5a983; font-weight: 600; }
    
    /* Dates */
    .dates { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 25px; 
      font-size: 10px; 
      color: #666; 
    }
    
    /* Section styling */
    .section { margin-bottom: 25px; }
    .section-title { 
      font-size: 13px; 
      font-weight: bold; 
      color: white; 
      background: #1e3a5f; 
      padding: 8px 15px; 
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-content { padding: 0 10px; }
    
    /* Info grid */
    .info-grid { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 20px; 
      margin-bottom: 25px; 
    }
    .info-box h4 { 
      font-size: 11px; 
      color: #666; 
      text-transform: uppercase; 
      margin-bottom: 8px; 
      border-bottom: 1px solid #eee; 
      padding-bottom: 4px; 
    }
    .info-row { margin-bottom: 4px; }
    .info-label { color: #666; }
    .info-value { font-weight: 600; color: #1e3a5f; }
    
    /* Rooms table */
    .rooms-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 15px; 
    }
    .rooms-table th { 
      background: #f8f9fa; 
      padding: 10px; 
      text-align: left; 
      font-size: 10px; 
      text-transform: uppercase; 
      color: #1e3a5f;
      border-bottom: 2px solid #ddd;
    }
    .rooms-table td { 
      padding: 10px; 
      border-bottom: 1px solid #eee; 
    }
    .room-name { font-weight: 600; }
    .room-btu { text-align: center; }
    .room-unit { text-align: right; color: #666; }
    
    /* Pricing */
    .pricing-box { 
      background: #f8f9fa; 
      border-radius: 8px; 
      padding: 20px; 
      margin-bottom: 20px; 
    }
    .pricing-row { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 8px; 
    }
    .pricing-row.subtotal { 
      border-top: 1px solid #ddd; 
      padding-top: 10px; 
      margin-top: 10px; 
    }
    .pricing-row.total { 
      font-size: 16px; 
      font-weight: bold; 
      background: #1e3a5f; 
      color: white; 
      margin: 15px -20px -20px; 
      padding: 15px 20px; 
      border-radius: 0 0 8px 8px; 
    }
    .pricing-row.total .amount { color: #d4a84b; }
    
    /* Addons */
    .addons-section { margin-bottom: 15px; }
    .addons-section h4 { font-size: 11px; color: #666; margin-bottom: 8px; }
    .addon-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 5px 0; 
      font-size: 10px; 
    }
    
    /* Financing */
    .financing-section { background: #fafafa; padding: 20px; border-radius: 8px; }
    .financing-section .section-title { margin: -20px -20px 15px; border-radius: 8px 8px 0 0; }
    .financing-total { font-size: 14px; margin-bottom: 15px; }
    .financing-grid { display: grid; gap: 10px; }
    .financing-option { 
      background: white; 
      padding: 12px; 
      border-radius: 6px; 
      border: 1px solid #eee; 
    }
    .financing-plan-name { font-weight: 600; color: #1e3a5f; margin-bottom: 4px; }
    .financing-details { font-size: 10px; color: #666; }
    .financing-disclaimer { 
      font-size: 9px; 
      color: #888; 
      margin-top: 15px; 
      font-style: italic; 
    }
    .deferred-disclaimer { 
      font-size: 9px; 
      color: #666; 
      margin-top: 10px; 
      padding: 10px; 
      background: #fff3cd; 
      border-radius: 4px; 
    }
    
    /* Next steps */
    .next-steps { margin-bottom: 25px; }
    .step-item { 
      display: flex; 
      gap: 15px; 
      margin-bottom: 12px; 
      padding: 10px; 
      background: #f8f9fa; 
      border-radius: 6px; 
    }
    .step-number { 
      width: 24px; 
      height: 24px; 
      background: #1e3a5f; 
      color: white; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 12px; 
      font-weight: bold; 
      flex-shrink: 0; 
    }
    .step-content h5 { font-size: 11px; color: #1e3a5f; margin-bottom: 2px; }
    .step-content p { font-size: 10px; color: #666; }
    
    /* Footer */
    .footer { 
      text-align: center; 
      border-top: 2px solid #a5a983; 
      padding-top: 20px; 
      margin-top: 30px; 
    }
    .contact-info { font-size: 11px; margin-bottom: 10px; }
    .contact-info a { color: #1e3a5f; text-decoration: none; }
    .contact-info a:hover { text-decoration: underline; }
    .license { font-size: 9px; color: #888; }
    
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .container { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      ${logoBase64 ? `<img src="${logoBase64}" alt="Truficient" class="logo" />` : ""}
      <div class="company-name">TRUFICIENT ENERGY SOLUTIONS</div>
      <div class="doc-title">Ductless Mini-Split Estimate</div>
    </div>
    
    <!-- Dates -->
    <div class="dates">
      <span>Date Generated: ${generatedDate}</span>
      <span>Estimate Valid Until: ${validUntilDate}</span>
    </div>
    
    <!-- Customer Info & System Summary -->
    <div class="info-grid">
      <div class="info-box">
        <h4>Customer Information</h4>
        <div class="info-row"><span class="info-label">Name:</span> <span class="info-value">${data.customerInfo.name}</span></div>
        <div class="info-row"><span class="info-label">Email:</span> <span class="info-value">${data.customerInfo.email}</span></div>
        <div class="info-row"><span class="info-label">Phone:</span> <span class="info-value">${data.customerInfo.phone || "Not provided"}</span></div>
        <div class="info-row"><span class="info-label">Address:</span> <span class="info-value">${customerAddress}</span></div>
      </div>
      <div class="info-box">
        <h4>System Summary</h4>
        <div class="info-row"><span class="info-label">System Type:</span> <span class="info-value">Ductless Mini-Split</span></div>
        <div class="info-row"><span class="info-label">Zones:</span> <span class="info-value">${data.pricing.zoneCount}</span></div>
        <div class="info-row"><span class="info-label">Total Capacity:</span> <span class="info-value">${data.pricing.totalBtu.toLocaleString()} BTU</span></div>
        <div class="info-row"><span class="info-label">System Tier:</span> <span class="info-value">${data.tierName}</span></div>
      </div>
    </div>
    
    <!-- Configured Zones -->
    <div class="section">
      <div class="section-title">Configured Zones</div>
      <table class="rooms-table">
        <thead>
          <tr>
            <th>Room/Zone</th>
            <th style="text-align: center;">Capacity</th>
            <th style="text-align: right;">Unit Style</th>
          </tr>
        </thead>
        <tbody>
          ${roomsHTML}
        </tbody>
      </table>
    </div>
    
    <!-- Pricing Breakdown -->
    <div class="section">
      <div class="section-title">Investment Summary</div>
      <div class="pricing-box">
        <div class="pricing-row">
          <span>Equipment (${data.pricing.zoneCount} zone${data.pricing.zoneCount !== 1 ? "s" : ""})</span>
          <span>${formatCurrency(data.pricing.baseEquipmentCost)}</span>
        </div>
        ${data.pricing.tierMultiplier !== 1 ? `
          <div class="pricing-row" style="font-size: 10px; color: #666; padding-left: 15px;">
            <span>× ${data.tierName} tier (${data.pricing.tierMultiplier}×)</span>
            <span>${formatCurrency(data.pricing.equipmentTotal)}</span>
          </div>
        ` : ""}
        
        ${addonsHTML}
        
        <div class="pricing-row subtotal">
          <span>Subtotal</span>
          <span>${formatCurrency(data.pricing.subtotal)}</span>
        </div>
        
        ${data.pricing.rebates > 0 ? `
          <div class="pricing-row" style="color: #d4a84b;">
            <span>Available Rebates</span>
            <span>-${formatCurrency(data.pricing.rebates)}</span>
          </div>
        ` : ""}
        
        <div class="pricing-row total">
          <span>Estimated Total</span>
          <span class="amount">${formatCurrency(data.pricing.finalTotal)}</span>
        </div>
      </div>
      <p style="text-align: center; font-size: 10px; color: #888;">Tax included in estimate</p>
    </div>
    
    <!-- Financing Options -->
    ${financingHTML}
    
    <!-- Next Steps -->
    <div class="section next-steps">
      <div class="section-title">What Happens Next</div>
      <div class="step-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <h5>Expert Quote Review</h5>
          <p>Our team reviews your request to ensure every detail is accurate and tailored to your home's needs.</p>
        </div>
      </div>
      <div class="step-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <h5>Personal Consultation</h5>
          <p>A Comfort Advisor will call within one business day to walk through your quote and answer questions.</p>
        </div>
      </div>
      <div class="step-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <h5>Technical Site Assessment</h5>
          <p>We'll perform an on-site visit to verify equipment sizing and installation requirements.</p>
        </div>
      </div>
      <div class="step-item">
        <div class="step-number">4</div>
        <div class="step-content">
          <h5>Precision Installation</h5>
          <p>Our trained team installs your new system with surgical care, adhering to all codes and specifications.</p>
        </div>
      </div>
      <div class="step-item">
        <div class="step-number">5</div>
        <div class="step-content">
          <h5>Performance Optimization</h5>
          <p>After installation, we conduct rigorous testing and calibrate the system for peak efficiency.</p>
        </div>
      </div>
      <div class="step-item">
        <div class="step-number">6</div>
        <div class="step-content">
          <h5>Warranty & Final Paperwork</h5>
          <p>We register your equipment to secure your warranty and provide a complete digital report.</p>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="contact-info">
        <strong>Phone/Text:</strong> (214) 238-4349 | 
        <strong>Email:</strong> info@truficient.com | 
        <strong>Web:</strong> <a href="https://truficient.com" target="_blank">truficient.com</a>
      </div>
      <div class="license">
        License: TACLB77247C | Mitsubishi Diamond Contractor | Serving Dallas-Fort Worth
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Open print dialog
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
