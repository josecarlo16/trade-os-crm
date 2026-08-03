type EstimateSection = 'admin_costs' | 'equipment_controls' | 'miscellaneous_inside' | 'miscellaneous_outside' | 'ducting' | 'labor';

interface LineItem {
  item_type: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  section?: EstimateSection;
}

interface EstimateData {
  estimate_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  job_type: string;
  heating_type: string;
  job_notes: string | null;
  created_at: string;
  valid_until: string | null;
}

interface Totals {
  subtotalCharge: number;
  taxAmount: number;
  grandTotal: number;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  residential_new: 'Residential - New Construction',
  residential_replacement: 'Residential - Replacement',
  commercial_new: 'Commercial - New Construction',
  commercial_replacement: 'Commercial - Replacement',
  maintenance: 'Maintenance',
  repair: 'Repair',
};

const HEATING_TYPE_LABELS: Record<string, string> = {
  gas: 'Gas Furnace',
  electric: 'Electric',
  heat_pump: 'Heat Pump',
  dual_fuel: 'Dual Fuel',
};

const SECTION_LABELS: Record<EstimateSection, string> = {
  admin_costs: 'Admin Costs',
  equipment_controls: 'Equipment & Controls',
  miscellaneous_inside: 'Miscellaneous Inside Items',
  miscellaneous_outside: 'Miscellaneous Outside Items',
  ducting: 'Ducting',
  labor: 'Labor',
};

const SECTION_ORDER: EstimateSection[] = [
  'admin_costs',
  'equipment_controls',
  'miscellaneous_inside',
  'miscellaneous_outside',
  'ducting',
  'labor',
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Group items by section
const groupItemsBySection = (items: LineItem[]): Record<EstimateSection, LineItem[]> => {
  const grouped: Record<EstimateSection, LineItem[]> = {
    admin_costs: [],
    equipment_controls: [],
    miscellaneous_inside: [],
    miscellaneous_outside: [],
    ducting: [],
    labor: [],
  };

  items.forEach(item => {
    const section = item.section || getDefaultSection(item.item_type);
    grouped[section].push(item);
  });

  return grouped;
};

// Get default section based on item type
const getDefaultSection = (itemType: string): EstimateSection => {
  switch (itemType) {
    case 'equipment': return 'equipment_controls';
    case 'labor': return 'labor';
    case 'admin_cost': return 'admin_costs';
    default: return 'miscellaneous_inside';
  }
};

// Calculate section subtotal
const calculateSectionSubtotal = (items: LineItem[]): number => {
  return items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
};

export const generateEstimatePDF = (
  estimate: EstimateData,
  lineItems: LineItem[],
  totals: Totals,
  taxRate: number
) => {
  const companyInfo = {
    name: 'Truficient HVAC',
    address: 'Dallas-Fort Worth Metroplex',
    phone: '(469) 506-0053',
    email: 'service@truficient.com',
    website: 'www.truficient.com',
  };

  // Group items by section
  const groupedItems = groupItemsBySection(lineItems);

  // Generate section HTML
  const generateSectionHTML = (section: EstimateSection, items: LineItem[]): string => {
    if (items.length === 0) return '';
    
    const sectionSubtotal = calculateSectionSubtotal(items);
    
    return `
      <div class="section-block">
        <div class="section-header">${SECTION_LABELS[section]}</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50%;">Description</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 15%; text-align: right;">Rate</th>
              <th style="width: 20%; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>
                  <span class="item-name">${item.name}</span>
                  ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                </td>
                <td style="text-align: center;">${item.quantity} ${item.unit}</td>
                <td style="text-align: right;">${formatCurrency(item.unit_cost)}</td>
                <td>${formatCurrency(item.quantity * item.unit_cost)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="section-subtotal">
          <span>Section Subtotal:</span>
          <span>${formatCurrency(sectionSubtotal)}</span>
        </div>
      </div>
    `;
  };

  // Build HTML content
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Estimate ${estimate.estimate_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1e3a5f;
      background: white;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #d4a84b;
    }
    .company-info h1 {
      font-size: 28px;
      color: #1e3a5f;
      margin-bottom: 5px;
    }
    .company-info p {
      color: #666;
      font-size: 11px;
    }
    .estimate-title {
      text-align: right;
    }
    .estimate-title h2 {
      font-size: 24px;
      color: #d4a84b;
      margin-bottom: 5px;
    }
    .estimate-number {
      font-size: 16px;
      font-weight: bold;
      color: #1e3a5f;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .info-box {
      width: 48%;
    }
    .info-box h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #eee;
    }
    .info-box p {
      margin-bottom: 5px;
    }
    .info-box strong {
      color: #1e3a5f;
    }
    .section-block {
      margin-bottom: 25px;
    }
    .section-header {
      background: #1e3a5f;
      color: white;
      padding: 10px 15px;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
    }
    .items-table th {
      background: #f8f9fa;
      color: #1e3a5f;
      padding: 10px 15px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      border-bottom: 1px solid #ddd;
    }
    .items-table th:last-child {
      text-align: right;
    }
    .items-table td {
      padding: 10px 15px;
      border-bottom: 1px solid #eee;
    }
    .items-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
    .items-table tr:nth-child(even) {
      background: #fafafa;
    }
    .item-name {
      font-weight: 600;
    }
    .item-description {
      font-size: 11px;
      color: #666;
    }
    .section-subtotal {
      display: flex;
      justify-content: flex-end;
      gap: 20px;
      padding: 10px 15px;
      background: #f0f0f0;
      font-weight: 600;
      font-size: 12px;
    }
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
      margin-top: 20px;
    }
    .totals-box {
      width: 300px;
      border: 2px solid #1e3a5f;
      border-radius: 8px;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 15px;
      border-bottom: 1px solid #eee;
    }
    .totals-row.grand-total {
      font-size: 18px;
      font-weight: bold;
      color: white;
      background: #1e3a5f;
      border-bottom: none;
    }
    .totals-row.grand-total .amount {
      color: #d4a84b;
    }
    .notes-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .notes-section h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 10px;
    }
    .terms-section {
      font-size: 10px;
      color: #666;
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
    .terms-section h4 {
      font-size: 11px;
      color: #1e3a5f;
      margin-bottom: 10px;
    }
    .terms-section ul {
      padding-left: 20px;
    }
    .terms-section li {
      margin-bottom: 5px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 11px;
    }
    .footer strong {
      color: #1e3a5f;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .container { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-info">
        <h1>${companyInfo.name}</h1>
        <p>${companyInfo.address}</p>
        <p>Phone: ${companyInfo.phone}</p>
        <p>Email: ${companyInfo.email}</p>
        <p>Web: ${companyInfo.website}</p>
      </div>
      <div class="estimate-title">
        <h2>ESTIMATE</h2>
        <div class="estimate-number">${estimate.estimate_number}</div>
        <p style="margin-top: 10px; color: #666;">Date: ${formatDate(estimate.created_at)}</p>
        ${estimate.valid_until ? `<p style="color: #666;">Valid Until: ${formatDate(estimate.valid_until)}</p>` : ''}
      </div>
    </div>

    <div class="info-section">
      <div class="info-box">
        <h3>Bill To</h3>
        <p><strong>${estimate.customer_name}</strong></p>
        ${estimate.customer_address ? `<p>${estimate.customer_address}</p>` : ''}
        ${estimate.customer_phone ? `<p>Phone: ${estimate.customer_phone}</p>` : ''}
        ${estimate.customer_email ? `<p>Email: ${estimate.customer_email}</p>` : ''}
      </div>
      <div class="info-box">
        <h3>Project Details</h3>
        <p><strong>Job Type:</strong> ${JOB_TYPE_LABELS[estimate.job_type] || estimate.job_type}</p>
        <p><strong>Heating Type:</strong> ${HEATING_TYPE_LABELS[estimate.heating_type] || estimate.heating_type}</p>
      </div>
    </div>

    <!-- Sections -->
    ${SECTION_ORDER.map(section => generateSectionHTML(section, groupedItems[section])).join('')}

    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${formatCurrency(totals.subtotalCharge)}</span>
        </div>
        <div class="totals-row">
          <span>Sales Tax (${(taxRate * 100).toFixed(2)}%)</span>
          <span>${formatCurrency(totals.taxAmount)}</span>
        </div>
        <div class="totals-row grand-total">
          <span>Total Due</span>
          <span class="amount">${formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>
    </div>

    ${estimate.job_notes ? `
      <div class="notes-section">
        <h3>Notes</h3>
        <p>${estimate.job_notes}</p>
      </div>
    ` : ''}

    <div class="terms-section">
      <h4>Terms & Conditions</h4>
      <ul>
        <li>This estimate is valid for 30 days from the date issued.</li>
        <li>A 50% deposit is required to schedule the work.</li>
        <li>Final payment is due upon completion of the project.</li>
        <li>All work is guaranteed for one year from installation date.</li>
        <li>Equipment warranties are provided by the manufacturer.</li>
        <li>Prices may vary if job conditions differ from initial assessment.</li>
      </ul>
    </div>

    <div class="footer">
      <p>Thank you for choosing <strong>${companyInfo.name}</strong></p>
      <p>We appreciate your business!</p>
    </div>
  </div>
</body>
</html>
  `;

  // Open print dialog
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

export const downloadEstimatePDF = (
  estimate: EstimateData,
  lineItems: LineItem[],
  totals: Totals,
  taxRate: number
) => {
  generateEstimatePDF(estimate, lineItems, totals, taxRate);
};
