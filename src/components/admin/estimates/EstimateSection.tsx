import { useState } from 'react';
import { ChevronDown, ChevronRight, Package, Users, Receipt, Wrench, Calculator, Plus, Trash2, GripVertical, Paperclip } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useEquipmentDocumentCounts } from '@/hooks/useEquipmentDocumentCounts';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_BADGE } from '@/types/equipmentDocument';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type EstimateSection = 'admin_costs' | 'equipment_controls' | 'miscellaneous_inside' | 'miscellaneous_outside' | 'ducting' | 'labor';

export interface LineItem {
  id?: string;
  item_type: 'equipment' | 'material' | 'labor' | 'admin_cost' | 'custom' | 'unit';
  name: string;
  description: string | null;
  material_id: string | null;
  labor_rate_id: string | null;
  admin_cost_id: string | null;
  equipment_system_id: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  line_total: number;
  sort_order: number;
  section?: EstimateSection;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface SectionConfig {
  key: EstimateSection;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  addButtons: { type: 'equipment' | 'material' | 'labor' | 'admin_cost' | 'custom' | 'unit'; label: string; icon: React.ReactNode }[];
}

export const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: 'admin_costs',
    title: 'Admin Costs',
    icon: <Receipt className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    addButtons: [
      { type: 'admin_cost', label: 'Admin Cost', icon: <Receipt className="h-4 w-4" /> },
      { type: 'custom', label: 'Custom', icon: <Plus className="h-4 w-4" /> },
    ],
  },
  {
    key: 'equipment_controls',
    title: 'Equipment & Controls',
    icon: <Wrench className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    addButtons: [
      { type: 'equipment', label: 'System', icon: <Wrench className="h-4 w-4" /> },
      { type: 'unit', label: 'Unit', icon: <Package className="h-4 w-4" /> },
      { type: 'custom', label: 'Custom', icon: <Plus className="h-4 w-4" /> },
    ],
  },
  {
    key: 'miscellaneous_inside',
    title: 'Miscellaneous Inside Items',
    icon: <Package className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    addButtons: [
      { type: 'material', label: 'Material', icon: <Package className="h-4 w-4" /> },
      { type: 'custom', label: 'Custom', icon: <Plus className="h-4 w-4" /> },
    ],
  },
  {
    key: 'miscellaneous_outside',
    title: 'Miscellaneous Outside Items',
    icon: <Package className="h-4 w-4" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-200',
    addButtons: [
      { type: 'material', label: 'Material', icon: <Package className="h-4 w-4" /> },
      { type: 'custom', label: 'Custom', icon: <Plus className="h-4 w-4" /> },
    ],
  },
  {
    key: 'ducting',
    title: 'Ducting',
    icon: <Package className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    addButtons: [
      { type: 'material', label: 'Material', icon: <Package className="h-4 w-4" /> },
      { type: 'custom', label: 'Custom', icon: <Plus className="h-4 w-4" /> },
    ],
  },
  {
    key: 'labor',
    title: 'Labor',
    icon: <Users className="h-4 w-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    addButtons: [
      { type: 'labor', label: 'Labor', icon: <Users className="h-4 w-4" /> },
      { type: 'custom', label: 'Custom', icon: <Plus className="h-4 w-4" /> },
    ],
  },
];

interface EstimateSectionProps {
  config: SectionConfig;
  items: LineItem[];
  onAddItem: (type: 'equipment' | 'material' | 'labor' | 'admin_cost' | 'custom' | 'unit', section: EstimateSection) => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof LineItem, value: any) => void;
  onReorderItems?: (sectionItems: LineItem[], newOrder: LineItem[]) => void;
  getActualIndex: (item: LineItem) => number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const getItemIcon = (itemType: string) => {
  switch (itemType) {
    case 'equipment': return <Wrench className="h-4 w-4 text-blue-500" />;
    case 'unit': return <Package className="h-4 w-4 text-blue-400" />;
    case 'material': return <Package className="h-4 w-4 text-green-500" />;
    case 'labor': return <Users className="h-4 w-4 text-amber-500" />;
    case 'admin_cost': return <Receipt className="h-4 w-4 text-purple-500" />;
    default: return <Calculator className="h-4 w-4 text-gray-500" />;
  }
};

// Indicator for default documents available on a system
const EquipmentDocsIndicator = ({ systemId }: { systemId: string }) => {
  const { data } = useEquipmentDocumentCounts('equipment_system');
  const defaults = data?.defaultsByOwner.get(systemId) ?? [];
  const [attached, setAttached] = useState<Set<string>>(new Set());
  if (defaults.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Default documents available"
        >
          <Paperclip className="h-3 w-3" /> {defaults.length} doc{defaults.length === 1 ? '' : 's'} available
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="text-xs font-semibold mb-2 text-foreground">Default documents</div>
        <div className="space-y-2">
          {defaults.map((d) => (
            <label key={d.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={attached.has(d.id)}
                onCheckedChange={(v) => {
                  setAttached((prev) => {
                    const next = new Set(prev);
                    if (v) next.add(d.id); else next.delete(d.id);
                    return next;
                  });
                }}
              />
              <Badge variant="outline" className={`${DOCUMENT_TYPE_BADGE[d.document_type]} h-5 px-1.5 text-[10px]`}>
                {DOCUMENT_TYPE_LABELS[d.document_type]}
              </Badge>
              <span className="truncate flex-1">{d.display_name || d.file_name}</span>
            </label>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Attach-to-estimate wiring coming soon.
        </p>
      </PopoverContent>
    </Popover>
  );
};

// Sortable row component
interface SortableRowProps {
  item: LineItem;
  actualIndex: number;
  onUpdateItem: (index: number, field: keyof LineItem, value: any) => void;
  onRemoveItem: (index: number) => void;
}

const SortableRow = ({ item, actualIndex, onUpdateItem, onRemoveItem }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id || `new-${item.sort_order}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted' : ''}>
      <TableCell className="w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>{getItemIcon(item.item_type)}</TableCell>
      <TableCell className="min-w-[120px]">
        {item.item_type === 'custom' ? (
          <Input
            value={item.name}
            onChange={(e) => onUpdateItem(actualIndex, 'name', e.target.value)}
            className="h-8 min-w-[100px]"
          />
        ) : (
          <div>
            <div className="font-medium flex items-center gap-2">
              {item.name}
              {item.equipment_system_id && (
                <EquipmentDocsIndicator systemId={item.equipment_system_id} />
              )}
            </div>
            {item.description && (
              <div className="text-xs text-muted-foreground">{item.description}</div>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="w-16">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.quantity}
          onChange={(e) => onUpdateItem(actualIndex, 'quantity', parseFloat(e.target.value) || 0)}
          className="h-8 w-16"
        />
      </TableCell>
      <TableCell className="text-muted-foreground w-12">{item.unit}</TableCell>
      <TableCell className="text-right w-20">
        {item.item_type === 'custom' || item.item_type === 'admin_cost' || item.item_type === 'equipment' ? (
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unit_cost}
            onChange={(e) => onUpdateItem(actualIndex, 'unit_cost', parseFloat(e.target.value) || 0)}
            className="h-8 w-20 text-right"
          />
        ) : (
          <span className="font-mono">{formatCurrency(item.unit_cost)}</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono font-semibold">
        {formatCurrency(item.quantity * item.unit_cost)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onRemoveItem(actualIndex)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export const EstimateSectionComponent = ({
  config,
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onReorderItems,
  getActualIndex,
}: EstimateSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const sectionTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => (item.id || `new-${item.sort_order}`) === active.id);
      const newIndex = items.findIndex(item => (item.id || `new-${item.sort_order}`) === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1 && onReorderItems) {
        const newOrder = arrayMove(items, oldIndex, newIndex);
        onReorderItems(items, newOrder);
      }
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg overflow-hidden">
      <CollapsibleTrigger asChild>
        <div className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${config.bgColor}`}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <span className={config.color}>{config.icon}</span>
            <h3 className="font-semibold">{config.title}</h3>
            <span className="text-sm text-muted-foreground">({items.length} items)</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono font-semibold">{formatCurrency(sectionTotal)}</span>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t">
          {/* Add buttons */}
          <div className="flex gap-2 p-3 bg-muted/30 border-b">
            {config.addButtons.map((btn) => (
              <Button
                key={btn.type}
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddItem(btn.type, config.key);
                }}
              >
                {btn.icon}
                <span className="ml-1">{btn.label}</span>
              </Button>
            ))}
          </div>

          {/* Items table */}
          {items.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No items in this section. Use the buttons above to add items.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                     <TableHead className="w-8">Type</TableHead>
                     <TableHead className="min-w-[120px]">Description</TableHead>
                     <TableHead className="w-16">Qty</TableHead>
                     <TableHead className="w-12">Unit</TableHead>
                     <TableHead className="w-20 text-right">Unit Cost</TableHead>
                     <TableHead className="w-24 text-right">Total</TableHead>
                     <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={items.map(item => item.id || `new-${item.sort_order}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((item) => (
                      <SortableRow
                        key={item.id || `new-${item.sort_order}`}
                        item={item}
                        actualIndex={getActualIndex(item)}
                        onUpdateItem={onUpdateItem}
                        onRemoveItem={onRemoveItem}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Helper to auto-assign section based on item type
export const getDefaultSection = (itemType: string): EstimateSection => {
  switch (itemType) {
    case 'equipment': return 'equipment_controls';
    case 'labor': return 'labor';
    case 'admin_cost': return 'admin_costs';
    case 'material':
    case 'custom':
    default: return 'miscellaneous_inside';
  }
};

// Section labels for display
export const SECTION_LABELS: Record<EstimateSection, string> = {
  admin_costs: 'Admin Costs',
  equipment_controls: 'Equipment & Controls',
  miscellaneous_inside: 'Miscellaneous Inside Items',
  miscellaneous_outside: 'Miscellaneous Outside Items',
  ducting: 'Ducting',
  labor: 'Labor',
};
