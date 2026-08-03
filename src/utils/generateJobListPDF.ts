interface JobListItem {
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
}

interface JobListData {
  estimate_number: string;
  supplier_name: string | null;
  notes: string | null;
  created_at?: string;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export const generateJobListPDF = (jobList: JobListData, items: JobListItem[]) => {
  const companyInfo = {
    name: 'Truficient HVAC',
    address: 'Dallas-Fort Worth Metroplex',
    phone: '(469) 506-0053',
    email: 'service@truficient.com',
    website: 'www.truficient.com',
  };

  const dateStr = formatDate(jobList.created_at || new Date().toISOString());

  const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
    );

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Job List ${escapeHtml(jobList.estimate_number)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1e3a5f;
      background: white;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #d4a84b;
    }
    .company-info h1 { font-size: 26px; color: #1e3a5f; margin-bottom: 5px; }
    .company-info p { color: #666; font-size: 11px; }
    .doc-title { text-align: right; }
    .doc-title h2 { font-size: 22px; color: #d4a84b; margin-bottom: 5px; }
    .doc-title .ref { font-size: 14px; font-weight: bold; color: #1e3a5f; }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
      gap: 20px;
    }
    .info-box { flex: 1; }
    .info-box h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #eee;
    }
    .info-box p { margin-bottom: 4px; }
    .info-box strong { color: #1e3a5f; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .items-table thead th {
      background: #1e3a5f;
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    .items-table tr:nth-child(even) td { background: #fafafa; }
    .item-name { font-weight: 600; }
    .item-description { font-size: 11px; color: #666; margin-top: 2px; }
    .qty-cell { text-align: center; width: 70px; font-weight: 600; }
    .unit-cell { text-align: center; width: 80px; color: #666; }
    .notes-section {
      background: #f8f9fa;
      border-left: 4px solid #d4a84b;
      padding: 15px 20px;
      margin-bottom: 25px;
    }
    .notes-section h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 11px;
    }
    .footer strong { color: #1e3a5f; }
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
      <div class="doc-title">
        <h2>JOB LIST / PARTS REQUEST</h2>
        <div class="ref">Ref: ${escapeHtml(jobList.estimate_number)}</div>
        <p style="margin-top: 10px; color: #666;">Date: ${dateStr}</p>
      </div>
    </div>

    <div class="info-section">
      <div class="info-box">
        <h3>Supplier</h3>
        <p><strong>${jobList.supplier_name ? escapeHtml(jobList.supplier_name) : '—'}</strong></p>
      </div>
      <div class="info-box">
        <h3>Linked Estimate</h3>
        <p><strong>${escapeHtml(jobList.estimate_number)}</strong></p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th class="qty-cell">Quantity</th>
          <th class="unit-cell">Unit</th>
          <th>Item</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td class="qty-cell">${item.quantity}</td>
            <td class="unit-cell">${escapeHtml(item.unit || 'each')}</td>
            <td><span class="item-name">${escapeHtml(item.name)}</span></td>
            <td>${item.description ? escapeHtml(item.description) : ''}</td>
          </tr>
        `
          )
          .join('')}
        ${
          items.length === 0
            ? `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #999;">No items</td></tr>`
            : ''
        }
      </tbody>
    </table>

    ${
      jobList.notes
        ? `
      <div class="notes-section">
        <h3>Notes</h3>
        <p>${escapeHtml(jobList.notes)}</p>
      </div>
    `
        : ''
    }

    <div class="footer">
      <p><strong>${companyInfo.name}</strong> &middot; ${companyInfo.phone} &middot; ${companyInfo.email}</p>
      <p>This is a parts/materials request — not a customer quote. No pricing included.</p>
    </div>
  </div>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

export const downloadJobListPDF = (jobList: JobListData, items: JobListItem[]) => {
  generateJobListPDF(jobList, items);
};
