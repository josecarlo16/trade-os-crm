import { format } from 'date-fns';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface DocumentPreviewProps {
  type: 'invoice' | 'estimate';
  documentNumber: string;
  date: string;
  dueDate?: string | null;
  validUntil?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  totalPaid?: number;
  notes?: string | null;
  terms?: string | null;
  status?: string;
  ccFeePercent?: number;
  ccFeeAmount?: number;
}

export function DocumentPreview({
  type,
  documentNumber,
  date,
  dueDate,
  validUntil,
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  lineItems,
  subtotal,
  taxRate,
  taxAmount,
  total,
  totalPaid = 0,
  notes,
  terms,
  status,
  ccFeePercent,
  ccFeeAmount,
}: DocumentPreviewProps) {
  const balanceDue = total - totalPaid;
  const isInvoice = type === 'invoice';
  const formattedDate = date ? format(new Date(date), 'MMMM d, yyyy') : '—';

  return (
    <div className="bg-white text-[#1e3a5f] rounded-lg border shadow-sm p-8 max-w-[700px] mx-auto text-[13px] leading-relaxed print:shadow-none print:border-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-5 border-b-[3px] border-[#d4a84b]">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] mb-1">Truficient HVAC</h1>
          <p className="text-[11px] text-gray-500">Dallas-Fort Worth Metroplex</p>
          <p className="text-[11px] text-gray-500">Phone: (469) 506-0053</p>
          <p className="text-[11px] text-gray-500">Email: service@truficient.com</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-[#d4a84b] uppercase mb-1">
            {isInvoice ? 'Invoice' : 'Estimate'}
          </h2>
          <p className="text-base font-bold text-[#1e3a5f]">{documentNumber || '—'}</p>
          <p className="text-[11px] text-gray-500 mt-2">Date: {formattedDate}</p>
          {isInvoice && dueDate && (
            <p className="text-[11px] text-gray-500">Due: {format(new Date(dueDate), 'MMMM d, yyyy')}</p>
          )}
          {!isInvoice && validUntil && (
            <p className="text-[11px] text-gray-500">Valid Until: {format(new Date(validUntil), 'MMMM d, yyyy')}</p>
          )}
          {status && (
            <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              status === 'paid' ? 'bg-green-100 text-green-700' :
              status === 'sent' ? 'bg-blue-100 text-blue-700' :
              status === 'overdue' ? 'bg-red-100 text-red-700' :
              status === 'accepted' ? 'bg-green-100 text-green-700' :
              status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {status}
            </span>
          )}
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8">
        <h3 className="text-[10px] uppercase text-gray-500 tracking-wide mb-2 pb-1 border-b border-gray-200">
          Bill To
        </h3>
        <p className="font-semibold">{customerName || 'Customer Name'}</p>
        {customerAddress && <p className="text-gray-600">{customerAddress}</p>}
        {customerPhone && <p className="text-gray-600">Phone: {customerPhone}</p>}
        {customerEmail && <p className="text-gray-600">Email: {customerEmail}</p>}
      </div>

      {/* Line Items */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left text-[10px] uppercase text-[#1e3a5f] py-2.5 px-3 font-semibold">Description</th>
            <th className="text-center text-[10px] uppercase text-[#1e3a5f] py-2.5 px-3 font-semibold w-[60px]">Qty</th>
            <th className="text-right text-[10px] uppercase text-[#1e3a5f] py-2.5 px-3 font-semibold w-[90px]">Rate</th>
            <th className="text-right text-[10px] uppercase text-[#1e3a5f] py-2.5 px-3 font-semibold w-[90px]">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center text-gray-400 py-8 text-sm">
                No line items added yet
              </td>
            </tr>
          ) : (
            lineItems.map((item, idx) => (
              <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                <td className="py-2.5 px-3 font-medium">{item.description || '—'}</td>
                <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                <td className="py-2.5 px-3 text-right">{fmt(item.unit_price)}</td>
                <td className="py-2.5 px-3 text-right font-semibold">{fmt(item.line_total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-[280px] border-2 border-[#1e3a5f] rounded-lg overflow-hidden">
          <div className="flex justify-between px-4 py-2.5 border-b border-gray-100">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {ccFeePercent && ccFeeAmount ? (
            <div className="flex justify-between px-4 py-2.5 border-b border-gray-100 text-gray-600">
              <span>CC Fee ({ccFeePercent}%)</span>
              <span>{fmt(ccFeeAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between px-4 py-2.5 border-b border-gray-100">
            <span>Tax ({(taxRate * 100).toFixed(2)}%)</span>
            <span>{fmt(taxAmount)}</span>
          </div>
          {isInvoice && totalPaid > 0 && (
            <div className="flex justify-between px-4 py-2.5 border-b border-gray-100 text-green-600">
              <span>Paid</span>
              <span>-{fmt(totalPaid)}</span>
            </div>
          )}
          <div className="flex justify-between px-4 py-3 bg-[#1e3a5f] text-white font-bold text-base">
            <span>{isInvoice && totalPaid > 0 ? 'Balance Due' : 'Total Due'}</span>
            <span className="text-[#d4a84b]">{fmt(isInvoice ? balanceDue : total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="bg-gray-50 rounded-lg px-5 py-4 mb-5">
          <h3 className="text-[10px] uppercase text-gray-500 tracking-wide mb-2 font-semibold">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{notes}</p>
        </div>
      )}

      {/* Terms */}
      {terms && (
        <div className="border-t border-gray-200 pt-4 mb-5">
          <h4 className="text-[11px] font-bold text-[#1e3a5f] mb-2">Terms & Conditions</h4>
          <p className="text-[10px] text-gray-500 whitespace-pre-wrap">{terms}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center border-t border-gray-200 pt-5 mt-8">
        <p className="text-[11px] text-gray-500">
          Thank you for choosing <strong className="text-[#1e3a5f]">Truficient HVAC</strong>
        </p>
        <p className="text-[11px] text-gray-500">We appreciate your business!</p>
      </div>
    </div>
  );
}

export function generatePrintableHTML(props: DocumentPreviewProps): string {
  const { type, documentNumber, date, dueDate, validUntil, customerName, customerEmail, customerPhone, customerAddress, lineItems, subtotal, taxRate, taxAmount, total, totalPaid = 0, notes, terms, status, ccFeePercent, ccFeeAmount } = props;
  const isInvoice = type === 'invoice';
  const balanceDue = total - totalPaid;
  const formattedDate = date ? format(new Date(date), 'MMMM d, yyyy') : '—';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${isInvoice ? 'Invoice' : 'Estimate'} ${documentNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Tahoma,sans-serif;font-size:13px;color:#1e3a5f;background:#fff;line-height:1.5}.c{max-width:700px;margin:0 auto;padding:40px}.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #d4a84b}.hdr h1{font-size:24px;color:#1e3a5f;margin-bottom:4px}.hdr p{color:#999;font-size:11px}.rt{text-align:right}.rt h2{font-size:20px;color:#d4a84b;margin-bottom:4px}.lbl{font-size:10px;text-transform:uppercase;color:#999;letter-spacing:.5px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #eee}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:#f8f9fa;color:#1e3a5f;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;border-bottom:1px solid #ddd}th:last-child{text-align:right}td{padding:10px 12px;border-bottom:1px solid #eee}td:last-child{text-align:right;font-weight:600}tr:nth-child(even){background:#fafafa}.tot{display:flex;justify-content:flex-end;margin-bottom:32px}.totb{width:280px;border:2px solid #1e3a5f;border-radius:8px;overflow:hidden}.totr{display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #eee}.grand{font-size:16px;font-weight:700;color:#fff;background:#1e3a5f;border-bottom:none}.grand .amt{color:#d4a84b}.notes{background:#f8f9fa;padding:16px 20px;border-radius:8px;margin-bottom:20px}.ft{text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #eee;color:#999;font-size:11px}.ft strong{color:#1e3a5f}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.c{padding:20px}}</style></head><body><div class="c">
<div class="hdr"><div><h1>Truficient HVAC</h1><p>Dallas-Fort Worth Metroplex</p><p>Phone: (469) 506-0053</p><p>Email: service@truficient.com</p></div><div class="rt"><h2>${isInvoice ? 'INVOICE' : 'ESTIMATE'}</h2><div style="font-size:16px;font-weight:700">${documentNumber}</div><p style="margin-top:8px">Date: ${formattedDate}</p>${isInvoice && dueDate ? `<p>Due: ${format(new Date(dueDate), 'MMMM d, yyyy')}</p>` : ''}${!isInvoice && validUntil ? `<p>Valid Until: ${format(new Date(validUntil), 'MMMM d, yyyy')}</p>` : ''}</div></div>
<div style="margin-bottom:32px"><div class="lbl">Bill To</div><p style="font-weight:600">${customerName}</p>${customerAddress ? `<p>${customerAddress}</p>` : ''}${customerPhone ? `<p>Phone: ${customerPhone}</p>` : ''}${customerEmail ? `<p>Email: ${customerEmail}</p>` : ''}</div>
<table><thead><tr><th style="width:50%">Description</th><th style="width:15%;text-align:center">Qty</th><th style="width:15%;text-align:right">Rate</th><th style="width:20%;text-align:right">Amount</th></tr></thead><tbody>${lineItems.map((li, i) => `<tr><td>${li.description}</td><td style="text-align:center">${li.quantity}</td><td style="text-align:right">${fmt(li.unit_price)}</td><td>${fmt(li.line_total)}</td></tr>`).join('')}</tbody></table>
<div class="tot"><div class="totb"><div class="totr"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>${ccFeePercent && ccFeeAmount ? `<div class="totr"><span>CC Fee (${ccFeePercent}%)</span><span>${fmt(ccFeeAmount)}</span></div>` : ''}<div class="totr"><span>Tax (${(taxRate * 100).toFixed(2)}%)</span><span>${fmt(taxAmount)}</span></div>${isInvoice && totalPaid > 0 ? `<div class="totr" style="color:green"><span>Paid</span><span>-${fmt(totalPaid)}</span></div>` : ''}<div class="totr grand"><span>${isInvoice && totalPaid > 0 ? 'Balance Due' : 'Total Due'}</span><span class="amt">${fmt(isInvoice ? balanceDue : total)}</span></div></div></div>
${notes ? `<div class="notes"><div class="lbl" style="border:none;padding:0;margin-bottom:8px">Notes</div><p>${notes}</p></div>` : ''}
${terms ? `<div style="border-top:1px solid #eee;padding-top:16px;margin-bottom:20px"><h4 style="font-size:11px;font-weight:700;margin-bottom:8px">Terms & Conditions</h4><p style="font-size:10px;color:#999;white-space:pre-wrap">${terms}</p></div>` : ''}
<div class="ft"><p>Thank you for choosing <strong>Truficient HVAC</strong></p><p>We appreciate your business!</p></div></div></body></html>`;
}

export function printDocument(props: DocumentPreviewProps) {
  const html = generatePrintableHTML(props);
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.onload = () => w.print(); }
}
