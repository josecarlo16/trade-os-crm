import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedCustomer {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  customer_type?: string;
  customer_status?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  lead_source?: string;
  notes?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const EXPECTED_HEADERS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'company_name',
  'customer_type',
  'customer_status',
  'billing_address',
  'billing_city',
  'billing_state',
  'billing_zip',
  'lead_source',
  'notes',
];

export function CustomerImportDialog({ open, onOpenChange }: CustomerImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ParsedCustomer[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const resetState = () => {
    setParsedData([]);
    setParseErrors([]);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseCSV = (text: string): { data: ParsedCustomer[]; errors: string[] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      return { data: [], errors: ['CSV must have a header row and at least one data row'] };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const firstNameIndex = headers.indexOf('first_name');
    
    if (firstNameIndex === -1) {
      return { data: [], errors: ['CSV must have a "first_name" column'] };
    }

    const data: ParsedCustomer[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        continue;
      }

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });

      if (!row.first_name) {
        errors.push(`Row ${i + 1}: Missing required field "first_name"`);
        continue;
      }

      // Validate email format if provided
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`Row ${i + 1}: Invalid email format "${row.email}"`);
        continue;
      }

      // Normalize customer_type and customer_status
      const customerType = row.customer_type?.toLowerCase();
      const customerStatus = row.customer_status?.toLowerCase();

      data.push({
        first_name: row.first_name,
        last_name: row.last_name || undefined,
        email: row.email || undefined,
        phone: row.phone || undefined,
        company_name: row.company_name || undefined,
        customer_type: customerType === 'commercial' ? 'commercial' : 'residential',
        customer_status: ['lead', 'prospect', 'active', 'inactive', 'archived'].includes(customerStatus || '')
          ? customerStatus
          : 'lead',
        billing_address: row.billing_address || undefined,
        billing_city: row.billing_city || undefined,
        billing_state: row.billing_state || undefined,
        billing_zip: row.billing_zip || undefined,
        lead_source: row.lead_source || 'import',
        notes: row.notes || undefined,
      });
    }

    return { data, errors };
  };

  // Handle CSV values that may contain commas within quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { data, errors } = parseCSV(text);
      setParsedData(data);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  };

  const importMutation = useMutation({
    mutationFn: async (customers: ParsedCustomer[]): Promise<ImportResult> => {
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      // Import in batches of 50
      const batchSize = 50;
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        const { error } = await supabase
          .from('crm_customers')
          .insert(batch.map(c => ({
            ...c,
            email: c.email || null,
          })));

        if (error) {
          failed += batch.length;
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          success += batch.length;
        }
      }

      return { success, failed, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['crm_customers'] });
      
      if (result.failed === 0) {
        toast.success(`Successfully imported ${result.success} customers`);
        onOpenChange(false);
        resetState();
      } else {
        toast.warning(`Imported ${result.success} customers, ${result.failed} failed`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const handleImport = () => {
    if (parsedData.length === 0) return;
    importMutation.mutate(parsedData);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Customers</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import customers. Required column: first_name
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!fileName ? (
              <div className="space-y-2">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop a CSV file, or click to browse
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select CSV File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 dark:text-emerald-400" />
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedData.length} valid records found
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetState();
                    fileInputRef.current?.click();
                  }}
                >
                  Choose Different File
                </Button>
              </div>
            )}
          </div>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {parseErrors.length} row(s) skipped due to errors
                </span>
              </div>
              <ScrollArea className="h-24">
                <ul className="text-xs text-muted-foreground space-y-1">
                  {parseErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="border rounded-lg">
              <div className="px-3 py-2 bg-muted/50 border-b">
                <span className="text-sm font-medium">Preview (first 5 rows)</span>
              </div>
              <ScrollArea className="h-40">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Phone</th>
                      <th className="px-3 py-2 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((customer, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          {customer.first_name} {customer.last_name}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {customer.email || '-'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {customer.phone || '-'}
                        </td>
                        <td className="px-3 py-2 capitalize">
                          {customer.customer_type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}

          {/* Download Template & Expected Format */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const header = EXPECTED_HEADERS.join(',');
                const sample = 'John,Doe,john@example.com,555-123-4567,Acme Corp,residential,lead,"123 Main St",Dallas,TX,75201,website,New customer';
                const blob = new Blob([header + '\n' + sample + '\n'], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'customer-import-template.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <span className="text-xs text-muted-foreground">
              CSV with columns: {EXPECTED_HEADERS.slice(0, 4).join(', ')}, …
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedData.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending
                ? 'Importing...'
                : `Import ${parsedData.length} Customer${parsedData.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
