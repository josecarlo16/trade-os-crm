import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLineItemAssist } from '@/hooks/useOttoAI';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import type { LineItemDraft } from '@/integrations/ottopay/types';

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

interface LineItemEditorProps {
  items: LineItemDraft[];
  onChange: (items: LineItemDraft[]) => void;
}

export function LineItemEditor({ items, onChange }: LineItemEditorProps) {
  const { assist, loading: aiLoading } = useLineItemAssist();
  const [assistingId, setAssistingId] = useState<string | null>(null);

  const addItem = () => {
    onChange([...items, { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, line_total: 0 }]);
  };

  const updateItem = (id: string, field: keyof LineItemDraft, value: string | number) => {
    onChange(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.line_total = Number(updated.quantity) * Number(updated.unit_price);
      }
      return updated;
    }));
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const handleAssist = async (id: string, description: string) => {
    setAssistingId(id);
    const result = await assist(description);
    updateItem(id, 'description', result);
    setAssistingId(null);
  };

  const subtotal = items.reduce((s, i) => s + i.line_total, 0);

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Description</TableHead>
            <TableHead className="w-[15%]">Qty</TableHead>
            <TableHead className="w-[20%]">Unit Price</TableHead>
            <TableHead className="w-[15%] text-right">Total</TableHead>
            <TableHead className="w-[10%]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Input
                    value={item.description}
                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Service or item description"
                    className="h-9"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={aiLoading || !item.description.trim()}
                          onClick={() => handleAssist(item.id, item.description)}
                        >
                          {assistingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>AI Assist — rewrite professionally</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={item.unit_price}
                  onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
              </TableCell>
              <TableCell className="text-right font-medium">{fmt(item.line_total)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                No line items yet. Click "Add Item" to start.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
        <div className="text-sm font-medium">Subtotal: {fmt(subtotal)}</div>
      </div>
    </div>
  );
}
