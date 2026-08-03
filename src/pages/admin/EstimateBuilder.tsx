import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { EstimateTagAutocomplete } from '@/components/admin/EstimateTagAutocomplete';
import { toast } from 'sonner';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Package, 
  Users, 
  Receipt, 
  Wrench,
  Search,
  FileDown,
  LayoutTemplate,
  History,
  X,
  MapPin,
  ChevronsUpDown,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateEstimatePDF } from '@/utils/generateEstimatePDF';
import { LinkedRecordsCard } from '@/components/admin/shared/LinkedRecordsCard';
import { FileAttachments } from '@/components/admin/FileAttachments';
import { WorkEdgeProjectSelector } from '@/components/admin/WorkEdgeProjectSelector';
import { VersionHistoryDialog } from '@/components/admin/estimates/VersionHistoryDialog';
import { 
  EstimateSectionComponent, 
  SECTION_CONFIGS, 
  getDefaultSection,
  type EstimateSection,
  type LineItem 
} from '@/components/admin/estimates/EstimateSection';
import { JobListPanel } from '@/components/admin/estimates/JobListPanel';

type JobType = 'residential_new' | 'residential_replacement' | 'commercial_new' | 'commercial_replacement' | 'maintenance' | 'repair';
type HeatingType = 'gas' | 'electric' | 'heat_pump' | 'dual_fuel';
type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
type LineItemType = 'equipment' | 'material' | 'labor' | 'admin_cost' | 'custom' | 'unit';

interface EstimateData {
  title: string;
  tags: string[];
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  job_type: JobType;
  heating_type: HeatingType;
  job_notes: string;
  status: EstimateStatus;
  profit_margin: number;
  tax_rate: number;
}

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'residential_new', label: 'Residential - New Construction' },
  { value: 'residential_replacement', label: 'Residential - Replacement' },
  { value: 'commercial_new', label: 'Commercial - New Construction' },
  { value: 'commercial_replacement', label: 'Commercial - Replacement' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
];

const HEATING_TYPES: { value: HeatingType; label: string }[] = [
  { value: 'gas', label: 'Gas Furnace' },
  { value: 'electric', label: 'Electric' },
  { value: 'heat_pump', label: 'Heat Pump' },
  { value: 'dual_fuel', label: 'Dual Fuel' },
];

const STATUS_OPTIONS: { value: EstimateStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
];

const EstimateBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';
  const savedEstimateIdRef = useRef<string | null>(null);

  const [formData, setFormData] = useState<EstimateData>({
    title: '',
    tags: [],
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    job_type: 'residential_replacement',
    heating_type: 'gas',
    job_notes: '',
    status: 'draft',
    profit_margin: 1.60,
    tax_rate: 0.0825,
  });
  const [tagInput, setTagInput] = useState('');

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addDialogType, setAddDialogType] = useState<LineItemType>('material');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [materialCategory, setMaterialCategory] = useState('all');
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedState, setLastSavedState] = useState<{ formData: EstimateData; lineItems: LineItem[] } | null>(null);
  
  // CRM customer/location picker state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [workedgeProjectId, setWorkedgeProjectId] = useState<string>('');
  const [customerComboOpen, setCustomerComboOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // (percentage-based admin cost dialog state removed — now auto-calculated)

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    useCallback(() => hasUnsavedChanges, [hasUnsavedChanges])
  );

  // Fetch CRM customers for picker
  const { data: crmCustomers = [] } = useQuery({
    queryKey: ['crm-customers-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_customers')
        .select('id, first_name, last_name, email, phone')
        .is('deleted_at', null)
        .order('last_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch locations for selected customer
  const { data: customerLocations = [] } = useQuery({
    queryKey: ['crm-locations-picker', selectedCustomerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_locations')
        .select('id, location_name, address_line1, address_line2, city, state, zip_code, is_primary')
        .eq('customer_id', selectedCustomerId!)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomerId,
  });

  // Fetch estimate templates
  const { data: templates = [] } = useQuery({
    queryKey: ['estimate-templates-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimate_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch estimate if editing
  const { data: estimate, isLoading: isLoadingEstimate } = useQuery({
    queryKey: ['estimate', id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  // Fetch line items
  const { data: existingLineItems = [] } = useQuery({
    queryKey: ['estimate-line-items', id],
    queryFn: async () => {
      if (isNew) return [];
      const { data, error } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', id)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  // Fetch materials
  const { data: materials = [] } = useQuery({
    queryKey: ['materials-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials_catalog')
        .select('*')
        .eq('is_active', true)
        .eq('show_in_estimates', true)
        .order('category')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch labor rates
  const { data: laborRates = [] } = useQuery({
    queryKey: ['labor-rates-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_rates')
        .select('*')
        .eq('is_active', true)
        .order('rate_type')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch admin costs
  const { data: adminCosts = [] } = useQuery({
    queryKey: ['admin-costs-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_costs')
        .select('*')
        .eq('is_active', true)
        .order('is_required', { ascending: false })
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch equipment systems
  const { data: equipmentSystems = [] } = useQuery({
    queryKey: ['equipment-systems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_systems')
        .select('*')
        .order('system_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch individual equipment (units)
  const { data: individualEquipment = [] } = useQuery({
    queryKey: ['individual-equipment-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('individual_equipment_pricing')
        .select('*')
        .eq('is_active', true)
        .order('brand');
      if (error) throw error;
      return data;
    },
  });

  // Set form data when estimate loads
  useEffect(() => {
    if (estimate) {
      const loadedFormData: EstimateData = {
        title: (estimate as any).title || '',
        tags: (estimate as any).tags || [],
        customer_name: estimate.customer_name || '',
        customer_email: estimate.customer_email || '',
        customer_phone: estimate.customer_phone || '',
        customer_address: estimate.customer_address || '',
        job_type: estimate.job_type,
        heating_type: estimate.heating_type,
        job_notes: estimate.job_notes || '',
        status: estimate.status,
        profit_margin: Number(estimate.profit_margin) || 1.60,
        tax_rate: Number(estimate.tax_rate) || 0.0825,
      };
      setFormData(loadedFormData);
      // Restore CRM links
      setSelectedCustomerId((estimate as any).customer_id || null);
      setSelectedLocationId((estimate as any).location_id || null);
      setWorkedgeProjectId((estimate as any).workedge_project_id || '');
      // Store initial state for change detection
      setLastSavedState(prev => prev ? { ...prev, formData: loadedFormData } : { formData: loadedFormData, lineItems: [] });
    }
  }, [estimate]);

  // Set line items when they load
  useEffect(() => {
    if (existingLineItems.length > 0) {
      const loadedItems = existingLineItems.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost),
        line_total: Number(item.line_total),
      }));
      setLineItems(loadedItems);
      // Store initial state for change detection
      setLastSavedState(prev => prev ? { ...prev, lineItems: loadedItems } : { formData, lineItems: loadedItems });
    }
  }, [existingLineItems]);

  // Track changes to formData and lineItems
  useEffect(() => {
    if (lastSavedState) {
      const formChanged = JSON.stringify(formData) !== JSON.stringify(lastSavedState.formData);
      const itemsChanged = JSON.stringify(lineItems) !== JSON.stringify(lastSavedState.lineItems);
      setHasUnsavedChanges(formChanged || itemsChanged);
    } else if (isNew) {
      // For new estimates, consider it has changes if there's a customer name or line items
      setHasUnsavedChanges(formData.customer_name.trim() !== '' || lineItems.length > 0);
    }
  }, [formData, lineItems, lastSavedState, isNew]);

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Auto-add required admin costs for new estimates
  useEffect(() => {
    if (isNew && adminCosts.length > 0 && lineItems.length === 0) {
      const requiredCosts = adminCosts.filter(c => c.is_required);
      if (requiredCosts.length > 0) {
        const newItems: LineItem[] = requiredCosts.map((cost, index) => ({
          item_type: 'admin_cost' as LineItemType,
          name: cost.name,
          description: cost.description,
          material_id: null,
          labor_rate_id: null,
          admin_cost_id: cost.id,
          equipment_system_id: null,
          quantity: 1,
          unit: 'each',
          unit_cost: Number(cost.amount),
          line_total: Number(cost.amount),
          sort_order: index,
          section: 'admin_costs' as EstimateSection,
          isNew: true,
        }));
        setLineItems(newItems);
      }
    }
  }, [isNew, adminCosts, lineItems.length]);

  // Calculate totals — split into base (non-percentage) and full (all items)
  const totals = useMemo(() => {
    const activeItems = lineItems.filter(item => !item.isDeleted);
    
    // Base subtotal excludes percentage-based items (unit === 'est. total') to prevent loops
    const baseSubtotalCost = activeItems
      .filter(item => item.unit !== 'est. total')
      .reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const baseSubtotalCharge = baseSubtotalCost * formData.profit_margin;

    // Full subtotal includes everything (for display and grand total)
    const subtotalCost = activeItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const subtotalCharge = subtotalCost * formData.profit_margin;
    const taxAmount = subtotalCharge * formData.tax_rate;
    const grandTotal = subtotalCharge + taxAmount;
    const netProfit = subtotalCharge - subtotalCost;

    return {
      baseSubtotalCharge,
      subtotalCost,
      subtotalCharge,
      taxAmount,
      grandTotal,
      netProfit,
      profitPercent: subtotalCost > 0 ? ((netProfit / subtotalCost) * 100) : 0,
    };
  }, [lineItems, formData.profit_margin, formData.tax_rate]);

  // Auto-recalculate percentage-based admin cost line items when base changes
  useEffect(() => {
    const hasPercentageItems = lineItems.some(item => item.unit === 'est. total' && !item.isDeleted);
    if (!hasPercentageItems) return;

    const needsUpdate = lineItems.some(item => 
      item.unit === 'est. total' && !item.isDeleted && item.quantity !== totals.baseSubtotalCharge
    );
    if (!needsUpdate) return;

    setLineItems(prev => prev.map(item => {
      if (item.unit === 'est. total' && !item.isDeleted) {
        return {
          ...item,
          quantity: totals.baseSubtotalCharge,
          line_total: totals.baseSubtotalCharge * item.unit_cost,
        };
      }
      return item;
    }));
  }, [totals.baseSubtotalCharge]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Use the ref if we already created this estimate (prevents duplicates)
      const existingId = savedEstimateIdRef.current || (isNew ? null : id);
      let estimateId = existingId;

      if (!existingId) {
        // Create new estimate
        const { data: newEstimate, error: createError } = await supabase
          .from('estimates')
          .insert({
            estimate_number: '', // Auto-generated
            title: formData.title || null,
            tags: formData.tags.length > 0 ? formData.tags : null,
            customer_name: formData.customer_name,
            customer_email: formData.customer_email || null,
            customer_phone: formData.customer_phone || null,
            customer_address: formData.customer_address || null,
            job_type: formData.job_type,
            heating_type: formData.heating_type,
            job_notes: formData.job_notes || null,
            status: formData.status,
            profit_margin: formData.profit_margin,
            tax_rate: formData.tax_rate,
            customer_id: selectedCustomerId || null,
            location_id: selectedLocationId || null,
            workedge_project_id: workedgeProjectId || null,
          } as any)
          .select()
          .single();

        if (createError) throw createError;
        estimateId = newEstimate.id;
        // Immediately store the ID so subsequent saves update instead of creating
        savedEstimateIdRef.current = estimateId;
      } else {
        // Update existing estimate
        const { error: updateError } = await supabase
          .from('estimates')
          .update({
            title: formData.title || null,
            tags: formData.tags.length > 0 ? formData.tags : null,
            customer_name: formData.customer_name,
            customer_email: formData.customer_email || null,
            customer_phone: formData.customer_phone || null,
            customer_address: formData.customer_address || null,
            job_type: formData.job_type,
            heating_type: formData.heating_type,
            job_notes: formData.job_notes || null,
            status: formData.status,
            profit_margin: formData.profit_margin,
            tax_rate: formData.tax_rate,
            customer_id: selectedCustomerId || null,
            location_id: selectedLocationId || null,
            workedge_project_id: workedgeProjectId || null,
          } as any)
          .eq('id', existingId);

        if (updateError) throw updateError;
      }

      // Handle line items
      const itemsToDelete = lineItems.filter(item => item.id && item.isDeleted).map(item => item.id!);
      const itemsToCreate = lineItems.filter(item => item.isNew && !item.isDeleted);
      const itemsToUpdate = lineItems.filter(item => item.id && !item.isNew && !item.isDeleted);

      // Delete removed items
      if (itemsToDelete.length > 0) {
        const { error } = await supabase
          .from('estimate_line_items')
          .delete()
          .in('id', itemsToDelete);
        if (error) throw error;
      }

      // Create new items
      if (itemsToCreate.length > 0) {
        const newItems = itemsToCreate.map(item => ({
          estimate_id: estimateId,
          item_type: item.item_type === 'unit' ? 'equipment' : item.item_type,
          name: item.name,
          description: item.description,
          material_id: item.material_id,
          labor_rate_id: item.labor_rate_id,
          admin_cost_id: item.admin_cost_id,
          equipment_system_id: item.equipment_system_id,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          sort_order: item.sort_order,
          section: item.section || getDefaultSection(item.item_type),
        }));

        const { error } = await supabase
          .from('estimate_line_items')
          .insert(newItems);
        if (error) throw error;
      }

      // Update existing items
      for (const item of itemsToUpdate) {
        const { error } = await supabase
          .from('estimate_line_items')
          .update({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_cost: item.unit_cost,
            sort_order: item.sort_order,
            section: item.section || getDefaultSection(item.item_type),
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      return estimateId;
    },
    onSuccess: (estimateId) => {
      // Clear isNew flags to prevent duplicate inserts on subsequent saves
      // This fixes the race condition where saving again before refetch completes
      // would re-insert items that still had isNew: true
      const clearedLineItems = lineItems
        .filter(item => !item.isDeleted) // Remove deleted items from state
        .map(item => ({
          ...item,
          isNew: false,
        }));
      setLineItems(clearedLineItems);
      
      // Update saved state with cleared flags to reset change tracking
      setLastSavedState({ formData, lineItems: clearedLineItems });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['estimate', estimateId] });
      toast.success(isNew ? 'Estimate created successfully' : 'Estimate saved successfully');
      if (isNew && !window.location.pathname.includes(estimateId!)) {
        navigate(`/admin/estimates/${estimateId}`, { replace: true });
      }
    },
    onError: (error) => {
      toast.error('Failed to save estimate: ' + error.message);
    },
  });

  // State to track which section we're adding to
  const [currentAddSection, setCurrentAddSection] = useState<EstimateSection>('miscellaneous_inside');

  // Handle add item from section
  const handleSectionAddItem = (type: LineItemType, section: EstimateSection) => {
    setCurrentAddSection(section);
    if (type === 'custom') {
      handleAddCustomItem(section);
    } else {
      setAddDialogType(type);
      setIsAddDialogOpen(true);
    }
  };

  // Map material category to section
  const getMaterialSection = (category: string): EstimateSection => {
    const categoryLower = (category || '').toLowerCase();
    
    // Outdoor materials - refrigerant lines, copper, supports for outdoor units
    if (['refrigerant', 'copper', 'supports'].includes(categoryLower)) {
      return 'miscellaneous_outside';
    }
    
    // Ductwork goes to ducting section
    if (categoryLower === 'ductwork') {
      return 'ducting';
    }
    
    // Everything else (electrical, controls, misc) goes inside
    return 'miscellaneous_inside';
  };

  // Add line item handlers
  const handleAddMaterial = (material: any, section?: EstimateSection) => {
    // Auto-map section based on material category, but allow override
    const autoSection = getMaterialSection(material.category);
    const targetSection = section || autoSection;
    
    const newItem: LineItem = {
      item_type: 'material',
      name: material.name,
      description: material.description,
      material_id: material.id,
      labor_rate_id: null,
      admin_cost_id: null,
      equipment_system_id: null,
      quantity: 1,
      unit: material.unit,
      unit_cost: parseFloat(material.unit_cost),
      line_total: parseFloat(material.unit_cost),
      sort_order: lineItems.length,
      section: targetSection,
      isNew: true,
    };
    setLineItems([...lineItems, newItem]);
    toast.success(`Added ${material.name} to ${SECTION_CONFIGS.find(s => s.key === targetSection)?.title || targetSection}`);
  };

  const handleAddLabor = (labor: any) => {
    const newItem: LineItem = {
      item_type: 'labor',
      name: labor.name,
      description: labor.description,
      material_id: null,
      labor_rate_id: labor.id,
      admin_cost_id: null,
      equipment_system_id: null,
      quantity: 1,
      unit: labor.rate_type === 'hourly' ? 'hr' : labor.rate_type === 'daily' ? 'day' : 'job',
      unit_cost: parseFloat(labor.rate),
      line_total: parseFloat(labor.rate),
      sort_order: lineItems.length,
      section: 'labor',
      isNew: true,
    };
    setLineItems([...lineItems, newItem]);
    toast.success(`Added ${labor.name}`);
  };

  const handleAddAdminCost = (cost: any) => {
    // Check if already added
    if (lineItems.some(item => item.admin_cost_id === cost.id && !item.isDeleted)) {
      toast.error(`${cost.name} is already added`);
      return;
    }

    if (cost.cost_type === 'percentage') {
      // Auto-calculate: use baseSubtotalCharge as quantity, percentage rate as unit_cost
      const percentageRate = parseFloat(cost.amount) / 100;
      const newItem: LineItem = {
        item_type: 'admin_cost',
        name: cost.name,
        description: `${cost.amount}% of estimated total`,
        material_id: null,
        labor_rate_id: null,
        admin_cost_id: cost.id,
        equipment_system_id: null,
        quantity: totals.baseSubtotalCharge,
        unit: 'est. total',
        unit_cost: percentageRate,
        line_total: totals.baseSubtotalCharge * percentageRate,
        sort_order: lineItems.length,
        section: 'admin_costs',
        isNew: true,
      };
      setLineItems([...lineItems, newItem]);
      toast.success(`Added ${cost.name}`);
      return;
    }

    // For fixed/per_job costs, add directly
    const newItem: LineItem = {
      item_type: 'admin_cost',
      name: cost.name,
      description: cost.description,
      material_id: null,
      labor_rate_id: null,
      admin_cost_id: cost.id,
      equipment_system_id: null,
      quantity: 1,
      unit: 'each',
      unit_cost: Number(cost.amount),
      line_total: Number(cost.amount),
      sort_order: lineItems.length,
      section: 'admin_costs',
      isNew: true,
    };
    setLineItems([...lineItems, newItem]);
    toast.success(`Added ${cost.name}`);
  };

  const handleAddEquipment = (equipment: any) => {
    const newItems: LineItem[] = [];
    const baseItem = {
      item_type: 'equipment' as const,
      material_id: null,
      labor_rate_id: null,
      admin_cost_id: null,
      equipment_system_id: equipment.id,
      quantity: 1,
      unit: 'each',
      section: 'equipment_controls' as EstimateSection,
      isNew: true,
    };

    // Add outdoor unit / condenser if present
    if (parseFloat(equipment.condenser_price) > 0) {
      newItems.push({
        ...baseItem,
        name: `Outdoor Unit (${equipment.condenser_heat_pump_model || 'Heat Pump/Condenser'})`,
        description: `${equipment.system_type} - ${equipment.tonnage}T`,
        unit_cost: parseFloat(equipment.condenser_price),
        line_total: parseFloat(equipment.condenser_price),
        sort_order: lineItems.length + newItems.length,
      });
    }

    // Add furnace if present (gas systems)
    if (parseFloat(equipment.furnace_price) > 0) {
      newItems.push({
        ...baseItem,
        name: `Gas Furnace (${equipment.furnace_model || 'Furnace'})`,
        description: equipment.furnace_afue ? `${equipment.furnace_afue}% AFUE` : null,
        unit_cost: parseFloat(equipment.furnace_price),
        line_total: parseFloat(equipment.furnace_price),
        sort_order: lineItems.length + newItems.length,
      });
    }

    // Add air handler if present (heat pump systems)
    if (parseFloat(equipment.air_handler_price) > 0) {
      newItems.push({
        ...baseItem,
        name: `Air Handler (${equipment.air_handler_model || 'Air Handler'})`,
        description: equipment.air_handler_cfm ? `${equipment.air_handler_cfm} CFM` : null,
        unit_cost: parseFloat(equipment.air_handler_price),
        line_total: parseFloat(equipment.air_handler_price),
        sort_order: lineItems.length + newItems.length,
      });
    }

    // Add evap coil if present
    if (parseFloat(equipment.evap_coil_price) > 0) {
      newItems.push({
        ...baseItem,
        name: `Evaporator Coil (${equipment.evap_coil_model || 'Evap Coil'})`,
        description: null,
        unit_cost: parseFloat(equipment.evap_coil_price),
        line_total: parseFloat(equipment.evap_coil_price),
        sort_order: lineItems.length + newItems.length,
      });
    }

    // Add heat kit if present
    if (parseFloat(equipment.heat_kit_price) > 0) {
      newItems.push({
        ...baseItem,
        name: `Electric Heat Kit (${equipment.heat_kit || 'Heat Kit'})`,
        description: null,
        unit_cost: parseFloat(equipment.heat_kit_price),
        line_total: parseFloat(equipment.heat_kit_price),
        sort_order: lineItems.length + newItems.length,
      });
    }

    // Add thermostat if present
    if (parseFloat(equipment.thermostat_price) > 0) {
      newItems.push({
        ...baseItem,
        name: `Thermostat (${equipment.thermostat_model || 'Thermostat'})`,
        description: null,
        unit_cost: parseFloat(equipment.thermostat_price),
        line_total: parseFloat(equipment.thermostat_price),
        sort_order: lineItems.length + newItems.length,
      });
    }

    if (newItems.length === 0) {
      toast.error('No priced components found for this system');
      return;
    }

    setLineItems([...lineItems, ...newItems]);
    setIsAddDialogOpen(false);
    toast.success(`Added ${newItems.length} components from ${equipment.system_name}`);
  };

  const handleAddUnit = (unit: any) => {
    const newItem: LineItem = {
      item_type: 'equipment',
      name: `${unit.brand} ${unit.model_number}`,
      description: `${unit.type} - ${unit.size}`,
      material_id: null,
      labor_rate_id: null,
      admin_cost_id: null,
      equipment_system_id: null,
      quantity: 1,
      unit: 'each',
      unit_cost: Number(unit.price),
      line_total: Number(unit.price),
      sort_order: lineItems.length,
      section: 'equipment_controls' as EstimateSection,
      isNew: true,
    };
    setLineItems([...lineItems, newItem]);
    setIsAddDialogOpen(false);
    toast.success(`Added ${unit.brand} ${unit.model_number}`);
  };

  const handleAddCustomItem = (section: EstimateSection = 'miscellaneous_inside') => {
    const newItem: LineItem = {
      item_type: 'custom',
      name: 'Custom Item',
      description: null,
      material_id: null,
      labor_rate_id: null,
      admin_cost_id: null,
      equipment_system_id: null,
      quantity: 1,
      unit: 'each',
      unit_cost: 0,
      line_total: 0,
      sort_order: lineItems.length,
      section: section,
      isNew: true,
    };
    setLineItems([...lineItems, newItem]);
  };

  // Apply template to estimate
  const handleApplyTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Update form data with template settings
    setFormData(prev => ({
      ...prev,
      job_type: template.job_type as JobType,
      heating_type: template.heating_type as HeatingType,
      profit_margin: Number(template.profit_margin),
    }));

    // Fetch template items
    const { data: templateItems, error } = await supabase
      .from('estimate_template_items')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order');

    if (error) {
      toast.error('Failed to load template items');
      return;
    }

    if (templateItems && templateItems.length > 0) {
      const newItems: LineItem[] = templateItems.map((item, index) => ({
        item_type: item.item_type as LineItemType,
        name: item.name,
        description: item.description,
        material_id: item.material_id,
        labor_rate_id: item.labor_rate_id,
        admin_cost_id: item.admin_cost_id,
        equipment_system_id: item.equipment_system_id,
        quantity: Number(item.quantity),
        unit: item.unit,
        unit_cost: Number(item.unit_cost),
        line_total: Number(item.quantity) * Number(item.unit_cost),
        sort_order: lineItems.length + index,
        isNew: true,
      }));

      setLineItems(prev => [...prev, ...newItems]);
    }

    setIsTemplateDialogOpen(false);
    toast.success(`Applied template: ${template.name}`);
  };

  // Generate PDF
  const handleExportPDF = () => {
    if (!estimate && isNew) {
      toast.error('Please save the estimate first before exporting');
      return;
    }

    const estimateData = {
      estimate_number: estimate?.estimate_number || 'NEW',
      customer_name: formData.customer_name,
      customer_email: formData.customer_email || null,
      customer_phone: formData.customer_phone || null,
      customer_address: formData.customer_address || null,
      job_type: formData.job_type,
      heating_type: formData.heating_type,
      job_notes: formData.job_notes || null,
      created_at: estimate?.created_at || new Date().toISOString(),
      valid_until: estimate?.valid_until || null,
    };

    const pdfLineItems = activeLineItems.map(item => ({
      item_type: item.item_type,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost,
      section: item.section || getDefaultSection(item.item_type),
    }));

    generateEstimatePDF(estimateData, pdfLineItems, totals, formData.tax_rate);
  };

  const handleRemoveItem = (index: number) => {
    const item = lineItems[index];
    if (item.id) {
      // Mark for deletion
      const updated = [...lineItems];
      updated[index] = { ...item, isDeleted: true };
      setLineItems(updated);
    } else {
      // Remove immediately if not saved
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleUpdateItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unit_cost') {
      updated[index].line_total = updated[index].quantity * updated[index].unit_cost;
    }
    setLineItems(updated);
  };

  // Handle reordering items within a section
  const handleReorderItems = (sectionItems: LineItem[], newOrder: LineItem[]) => {
    // Create a new lineItems array with updated sort_order
    const updated = [...lineItems];
    
    // Get all items not in this section (to preserve their order)
    const otherItems = updated.filter(item => !sectionItems.includes(item));
    
    // Update sort_order for reordered items based on their new position
    const reorderedItems = newOrder.map((item, index) => {
      const actualIndex = updated.findIndex(li => li === item || (li.id && li.id === item.id));
      if (actualIndex !== -1) {
        updated[actualIndex] = { ...updated[actualIndex], sort_order: index };
      }
      return updated[actualIndex];
    });
    
    setLineItems(updated);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Filter equipment by search
  const filteredEquipment = equipmentSystems.filter(eq =>
    eq.system_name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    eq.condenser_heat_pump_model?.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    eq.ahri_number?.toLowerCase().includes(equipmentSearch.toLowerCase())
  );

  // Filter individual equipment by search
  const filteredUnits = individualEquipment.filter((u: any) =>
    u.brand.toLowerCase().includes(unitSearch.toLowerCase()) ||
    u.model_number.toLowerCase().includes(unitSearch.toLowerCase()) ||
    u.type.toLowerCase().includes(unitSearch.toLowerCase())
  );

  // Filter materials by category
  const filteredMaterials = materialCategory === 'all' 
    ? materials 
    : materials.filter(m => m.category === materialCategory);

  const activeLineItems = lineItems.filter(item => !item.isDeleted);

  if (!isNew && isLoadingEstimate) {
    return (
      <AdminLayout title="Loading...">
        <div className="text-center py-8 text-muted-foreground">Loading estimate...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isNew ? 'New Estimate' : `Estimate ${estimate?.estimate_number || ''}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/estimates')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isNew ? 'New Estimate' : `Estimate ${estimate?.estimate_number}`}
              </h1>
              {!isNew && (
                <p className="text-muted-foreground">
                  Created {estimate?.created_at && format(new Date(estimate.created_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isNew && templates.length > 0 && (
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)}>
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            )}
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData({ ...formData, status: v as EstimateStatus })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isNew && (
              <>
                <Button variant="outline" onClick={() => setIsVersionHistoryOpen(true)}>
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
                <Button variant="outline" onClick={handleExportPDF}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </>
            )}
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button 
              variant="secondary"
              onClick={() => {
                saveMutation.mutate(undefined, {
                  onSuccess: () => {
                    navigate('/admin/estimates');
                  }
                });
              }} 
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save & Exit
            </Button>
          </div>
        </div>

        {/* Title & Tags */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Estimate Title / Subject</Label>
              <Input
                placeholder="e.g. Smith Residence – Full System Replacement"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <EstimateTagAutocomplete
                tags={formData.tags}
                onChange={(tags) => setFormData({ ...formData, tags })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* CRM Customer Picker */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>CRM Customer</Label>
                    <Popover open={customerComboOpen} onOpenChange={setCustomerComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={customerComboOpen}
                          className="w-full justify-between font-normal"
                        >
                          {selectedCustomerId
                            ? (() => {
                                const c = crmCustomers.find(c => c.id === selectedCustomerId);
                                return c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unnamed' : 'Select customer...';
                              })()
                            : 'Search CRM customer...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search by name, email, or phone..."
                            value={customerSearchTerm}
                            onValueChange={setCustomerSearchTerm}
                          />
                          <CommandList>
                            <CommandEmpty>No customers found.</CommandEmpty>
                            <CommandGroup>
                              {crmCustomers
                                .filter(c => {
                                  if (!customerSearchTerm) return true;
                                  const term = customerSearchTerm.toLowerCase();
                                  return (
                                    (c.first_name || '').toLowerCase().includes(term) ||
                                    (c.last_name || '').toLowerCase().includes(term) ||
                                    (c.email || '').toLowerCase().includes(term) ||
                                    (c.phone || '').includes(term)
                                  );
                                })
                                .slice(0, 50)
                                .map(c => (
                                  <CommandItem
                                    key={c.id}
                                    value={c.id}
                                    onSelect={() => {
                                      setSelectedCustomerId(c.id);
                                      setSelectedLocationId(null);
                                      setFormData(prev => ({
                                        ...prev,
                                        customer_name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
                                        customer_email: c.email || '',
                                        customer_phone: c.phone || '',
                                      }));
                                      setCustomerComboOpen(false);
                                      setCustomerSearchTerm('');
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", selectedCustomerId === c.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {`${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed'}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {[c.email, c.phone].filter(Boolean).join(' · ')}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {selectedCustomerId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedCustomerId(null);
                        setSelectedLocationId(null);
                        setFormData(prev => ({
                          ...prev,
                          customer_name: '',
                          customer_email: '',
                          customer_phone: '',
                          customer_address: '',
                        }));
                      }}
                      title="Clear customer"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="John Smith"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">Email</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Phone</Label>
                    <Input
                      id="customer_phone"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_address">Address</Label>
                    <Input
                      id="customer_address"
                      value={formData.customer_address}
                      onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                      placeholder="123 Main St, Dallas, TX 75001"
                    />
                  </div>
                </div>

                {/* Location Picker - shown when customer is selected */}
                {selectedCustomerId && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Customer Location
                    </Label>
                    {customerLocations.length > 0 ? (
                      <Select
                        value={selectedLocationId || ''}
                        onValueChange={(v) => {
                          setSelectedLocationId(v || null);
                          const loc = customerLocations.find(l => l.id === v);
                          if (loc) {
                            const parts = [loc.address_line1, loc.address_line2, `${loc.city}, ${loc.state} ${loc.zip_code}`].filter(Boolean);
                            setFormData(prev => ({ ...prev, customer_address: parts.join(', ') }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a location..." />
                        </SelectTrigger>
                        <SelectContent>
                          {customerLocations.map(loc => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.address_line1}, {loc.city}, {loc.state} {loc.zip_code}
                              {loc.is_primary && ' (Primary)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No locations on file for this customer</p>
                    )}
                  </div>
                )}

                {/* WorkEdge Project Link */}
                <WorkEdgeProjectSelector
                  value={workedgeProjectId}
                  onChange={setWorkedgeProjectId}
                  customerId={selectedCustomerId}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job_type">Job Type</Label>
                    <Select
                      value={formData.job_type}
                      onValueChange={(v) => setFormData({ ...formData, job_type: v as JobType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heating_type">Heating Type</Label>
                    <Select
                      value={formData.heating_type}
                      onValueChange={(v) => setFormData({ ...formData, heating_type: v as HeatingType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEATING_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_notes">Job Notes</Label>
                  <Textarea
                    id="job_notes"
                    value={formData.job_notes}
                    onChange={(e) => setFormData({ ...formData, job_notes: e.target.value })}
                    placeholder="Additional notes about the job..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items - Sectioned */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Line Items</h2>
                <span className="text-sm text-muted-foreground">
                  {activeLineItems.length} items
                </span>
              </div>
              
              {SECTION_CONFIGS.map((config) => {
                const sectionItems = activeLineItems.filter(
                  item => (item.section || getDefaultSection(item.item_type)) === config.key
                );
                return (
                  <EstimateSectionComponent
                    key={config.key}
                    config={config}
                    items={sectionItems}
                    onAddItem={handleSectionAddItem}
                    onRemoveItem={handleRemoveItem}
                    onUpdateItem={handleUpdateItem}
                    onReorderItems={handleReorderItems}
                    getActualIndex={(item) => 
                      lineItems.findIndex(li => li === item || (li.id && li.id === item.id))
                    }
                  />
                );
              })}
            </div>

            {!isNew && id && (
              <JobListPanel estimateId={id} />
            )}
          </div>


          {/* Summary Panel */}
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Estimate Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profit Margin Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Profit Margin</Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        className="w-16 h-8 text-center text-sm px-1"
                        value={Math.round((formData.profit_margin - 1) * 100)}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          if (!isNaN(raw)) {
                            setFormData({ ...formData, profit_margin: raw / 100 + 1 });
                          }
                        }}
                        onBlur={(e) => {
                          const clamped = Math.min(150, Math.max(20, Number(e.target.value) || 20));
                          setFormData({ ...formData, profit_margin: clamped / 100 + 1 });
                        }}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                      <span className="text-xs text-muted-foreground">({formData.profit_margin.toFixed(2)}x)</span>
                    </div>
                  </div>
                  <Slider
                    value={[formData.profit_margin]}
                    min={1.2}
                    max={2.5}
                    step={0.01}
                    onValueChange={([value]) => setFormData({ ...formData, profit_margin: value })}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>20%</span>
                    <span>150%</span>
                  </div>
                </div>

                {/* Tax Rate */}
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    value={(formData.tax_rate * 100).toFixed(2)}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) / 100 || 0 })}
                  />
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (Cost)</span>
                    <span className="font-mono">{formatCurrency(totals.subtotalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (Charge)</span>
                    <span className="font-mono">{formatCurrency(totals.subtotalCharge)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sales Tax ({(formData.tax_rate * 100).toFixed(2)}%)</span>
                    <span className="font-mono">{formatCurrency(totals.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span>Grand Total</span>
                    <span className="font-mono text-primary">{formatCurrency(totals.grandTotal)}</span>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm">Profit Analysis</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Net Profit</span>
                    <span className="font-mono text-green-600">{formatCurrency(totals.netProfit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Profit %</span>
                    <span className="font-mono text-green-600">{totals.profitPercent.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Linked Records */}
            {!isNew && id && (
              <LinkedRecordsCard
                entityType="estimate"
                entityId={id}
                customerId={selectedCustomerId}
                workedgeProjectId={workedgeProjectId || null}
              />
            )}

            {/* File Attachments */}
            {!isNew && id && (
              <FileAttachments entityType="estimate" entityId={id} title="Attachments" compact />
            )}
          </div>
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {addDialogType === 'equipment' && 'Add System'}
              {addDialogType === 'unit' && 'Add Individual Unit'}
              {addDialogType === 'material' && 'Add Material'}
              {addDialogType === 'labor' && 'Add Labor'}
              {addDialogType === 'admin_cost' && 'Add Admin Cost'}
            </DialogTitle>
          </DialogHeader>

          {/* Equipment Search */}
          {addDialogType === 'equipment' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by system name, model, or AHRI..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredEquipment.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No equipment found</p>
                ) : (
                  filteredEquipment.map((eq) => {
                    const totalPrice = Number(eq.system_price) || 0;
                    
                    return (
                      <div
                        key={eq.id}
                        className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => handleAddEquipment(eq)}
                      >
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium">{eq.system_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {eq.system_type} • {eq.tonnage}T • SEER2: {eq.seer2}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-semibold">{formatCurrency(totalPrice)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Unit Equipment Search */}
          {addDialogType === 'unit' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by brand, model, or type..."
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredUnits.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No individual equipment found</p>
                ) : (
                  filteredUnits.map((unit: any) => (
                    <div
                      key={unit.id}
                      className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleAddUnit(unit)}
                    >
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{unit.brand} {unit.model_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {unit.type} • {unit.size}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold">{formatCurrency(Number(unit.price))}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Materials */}
          {addDialogType === 'material' && (
            <div className="space-y-4">
              <Select value={materialCategory} onValueChange={setMaterialCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="refrigerant">Refrigerant</SelectItem>
                  <SelectItem value="copper">Copper</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="ductwork">Ductwork</SelectItem>
                  <SelectItem value="controls">Controls</SelectItem>
                  <SelectItem value="supports">Supports</SelectItem>
                  <SelectItem value="misc">Misc</SelectItem>
                </SelectContent>
              </Select>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => { handleAddMaterial(mat, currentAddSection || undefined); }}
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">{mat.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{mat.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold">{formatCurrency(Number(mat.unit_cost))}</div>
                        <div className="text-xs text-muted-foreground">per {mat.unit}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Labor */}
          {addDialogType === 'labor' && (
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {laborRates.map((labor) => (
                <div
                  key={labor.id}
                  className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleAddLabor(labor)}
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{labor.name}</div>
                      <div className="text-sm text-muted-foreground capitalize">{labor.rate_type} rate</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold">{formatCurrency(Number(labor.rate))}</div>
                      <div className="text-xs text-muted-foreground">
                        {labor.rate_type === 'hourly' ? '/hr' : labor.rate_type === 'daily' ? '/day' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Admin Costs */}
          {addDialogType === 'admin_cost' && (
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {adminCosts.map((cost) => {
                const isAdded = lineItems.some(item => item.admin_cost_id === cost.id && !item.isDeleted);
                return (
                  <div
                    key={cost.id}
                    className={`p-3 border rounded-lg transition-colors ${
                      isAdded 
                        ? 'bg-muted opacity-50 cursor-not-allowed' 
                        : 'hover:bg-muted cursor-pointer'
                    }`}
                    onClick={() => !isAdded && handleAddAdminCost(cost)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {cost.name}
                          {cost.is_required && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Required</span>
                          )}
                          {isAdded && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Added</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">{cost.cost_type}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold">
                          {cost.cost_type === 'percentage' 
                            ? `${cost.amount}%` 
                            : formatCurrency(Number(cost.amount))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No active templates available</p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleApplyTemplate(template.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground">{template.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {JOB_TYPES.find(t => t.value === template.job_type)?.label} • {HEATING_TYPES.find(t => t.value === template.heating_type)?.label}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono text-primary">
                        {((Number(template.profit_margin) - 1) * 100).toFixed(0)}% margin
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      {!isNew && id && (
        <VersionHistoryDialog
          open={isVersionHistoryOpen}
          onOpenChange={setIsVersionHistoryOpen}
          estimateId={id}
          currentEstimate={{
            customer_name: formData.customer_name,
            status: formData.status,
            job_type: formData.job_type,
            heating_type: formData.heating_type,
            profit_margin: formData.profit_margin,
            tax_rate: formData.tax_rate,
            grand_total: totals.grandTotal,
          }}
          onRestoreVersion={(versionData) => {
            // Restore form data from version
            setFormData({
              title: formData.title,
              tags: formData.tags,
              customer_name: versionData.customer_name || '',
              customer_email: versionData.customer_email || '',
              customer_phone: versionData.customer_phone || '',
              customer_address: versionData.customer_address || '',
              job_type: versionData.job_type as JobType,
              heating_type: versionData.heating_type as HeatingType,
              job_notes: versionData.job_notes || '',
              status: versionData.status as EstimateStatus,
              profit_margin: Number(versionData.profit_margin) || 1.60,
              tax_rate: Number(versionData.tax_rate) || 0.0825,
            });
            
            // Restore line items - mark existing as deleted and add version items as new
            const restoredItems: LineItem[] = (versionData.line_items || []).map((item, index) => ({
              item_type: item.item_type as LineItemType,
              name: item.name,
              description: item.description,
              material_id: null,
              labor_rate_id: null,
              admin_cost_id: null,
              equipment_system_id: null,
              quantity: Number(item.quantity),
              unit: item.unit,
              unit_cost: Number(item.unit_cost),
              line_total: Number(item.line_total),
              sort_order: index,
              isNew: true,
            }));
            
            // Mark all current items for deletion and add restored items
            const deletedItems = lineItems.filter(item => item.id).map(item => ({
              ...item,
              isDeleted: true,
            }));
            
            setLineItems([...deletedItems, ...restoredItems]);
          }}
        />
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={blocker.state === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this estimate. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              Stay on Page
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => blocker.proceed?.()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Percentage admin cost dialog removed — now auto-calculated */}
    </AdminLayout>
  );
};

// Need to import format from date-fns at the top
import { format } from 'date-fns';

export default EstimateBuilder;
