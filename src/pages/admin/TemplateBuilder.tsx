import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Save, 
  ArrowLeft, 
  Package, 
  Users, 
  Receipt, 
  Wrench,
  Search,
  LayoutTemplate
} from 'lucide-react';
import { 
  EstimateSectionComponent, 
  SECTION_CONFIGS, 
  getDefaultSection,
  type EstimateSection,
  type LineItem 
} from '@/components/admin/estimates/EstimateSection';

type LineItemType = 'equipment' | 'material' | 'labor' | 'admin_cost' | 'custom' | 'unit';

const TemplateBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addDialogType, setAddDialogType] = useState<LineItemType>('material');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [materialCategory, setMaterialCategory] = useState('all');
  const [currentAddSection, setCurrentAddSection] = useState<EstimateSection>('miscellaneous_inside');

  // Fetch template
  const { data: template, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimate_templates')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch template items
  const { data: existingItems = [] } = useQuery({
    queryKey: ['template-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimate_template_items')
        .select('*')
        .eq('template_id', id)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
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

  // Load existing items
  useEffect(() => {
    if (existingItems.length > 0) {
      const loadedItems = existingItems.map(item => ({
        id: item.id,
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
        sort_order: item.sort_order,
        section: item.section as EstimateSection,
      }));
      setLineItems(loadedItems);
    }
  }, [existingItems]);

  // Calculate totals
  const totals = useMemo(() => {
    const activeItems = lineItems.filter(item => !item.isDeleted);
    const subtotalCost = activeItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    return { subtotalCost, itemCount: activeItems.length };
  }, [lineItems]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const itemsToDelete = lineItems.filter(item => item.id && item.isDeleted).map(item => item.id!);
      const itemsToCreate = lineItems.filter(item => item.isNew && !item.isDeleted);
      const itemsToUpdate = lineItems.filter(item => item.id && !item.isNew && !item.isDeleted);

      // Delete removed items
      if (itemsToDelete.length > 0) {
        const { error } = await supabase
          .from('estimate_template_items')
          .delete()
          .in('id', itemsToDelete);
        if (error) throw error;
      }

      // Create new items
      if (itemsToCreate.length > 0) {
        const newItems = itemsToCreate.map(item => ({
          template_id: id,
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
          .from('estimate_template_items')
          .insert(newItems);
        if (error) throw error;
      }

      // Update existing items
      for (const item of itemsToUpdate) {
        const { error } = await supabase
          .from('estimate_template_items')
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-items', id] });
      queryClient.invalidateQueries({ queryKey: ['estimate-templates'] });
      toast.success('Template saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    },
  });

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
    if (['refrigerant', 'copper', 'supports'].includes(categoryLower)) {
      return 'miscellaneous_outside';
    }
    if (categoryLower === 'ductwork') {
      return 'ducting';
    }
    return 'miscellaneous_inside';
  };

  const handleAddMaterial = (material: any, section?: EstimateSection) => {
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
    toast.success(`Added ${material.name}`);
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
    if (lineItems.some(item => item.admin_cost_id === cost.id && !item.isDeleted)) {
      toast.error(`${cost.name} is already added`);
      return;
    }

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
      unit_cost: parseFloat(cost.amount),
      line_total: parseFloat(cost.amount),
      sort_order: lineItems.length,
      section: 'admin_costs',
      isNew: true,
    };
    setLineItems([...lineItems, newItem]);
    toast.success(`Added ${cost.name}`);
  };

  const handleAddEquipment = (equipment: any) => {
    const totalPrice = parseFloat(equipment.system_price) || 0;

    const newItem: LineItem = {
      item_type: 'equipment',
      name: equipment.system_name,
      description: `${equipment.system_type} - ${equipment.tonnage}T - SEER2: ${equipment.seer2}`,
      material_id: null,
      labor_rate_id: null,
      admin_cost_id: null,
      equipment_system_id: equipment.id,
      quantity: 1,
      unit: 'system',
      unit_cost: totalPrice,
      line_total: totalPrice,
      sort_order: lineItems.length,
      section: 'equipment_controls',
      isNew: true,
    };
    setLineItems([...lineItems, newItem]);
    setIsAddDialogOpen(false);
    toast.success(`Added ${equipment.system_name}`);
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
      section: 'equipment_controls',
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

  const handleRemoveItem = (index: number) => {
    const item = lineItems[index];
    if (item.id) {
      const updated = [...lineItems];
      updated[index] = { ...item, isDeleted: true };
      setLineItems(updated);
    } else {
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

  const handleReorderItems = (sectionItems: LineItem[], newOrder: LineItem[]) => {
    const updated = [...lineItems];
    newOrder.forEach((item, index) => {
      const actualIndex = updated.findIndex(li => li === item || (li.id && li.id === item.id));
      if (actualIndex !== -1) {
        updated[actualIndex] = { ...updated[actualIndex], sort_order: index };
      }
    });
    setLineItems(updated);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const filteredEquipment = equipmentSystems.filter(eq =>
    eq.system_name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    eq.condenser_heat_pump_model?.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    eq.ahri_number?.toLowerCase().includes(equipmentSearch.toLowerCase())
  );

  const filteredUnits = individualEquipment.filter((u: any) =>
    u.brand.toLowerCase().includes(unitSearch.toLowerCase()) ||
    u.model_number.toLowerCase().includes(unitSearch.toLowerCase()) ||
    u.type.toLowerCase().includes(unitSearch.toLowerCase())
  );

  const filteredMaterials = materialCategory === 'all'
    ? materials 
    : materials.filter(m => m.category === materialCategory);

  const activeLineItems = lineItems.filter(item => !item.isDeleted);

  if (isLoadingTemplate) {
    return (
      <AdminLayout title="Loading...">
        <div className="text-center py-8 text-muted-foreground">Loading template...</div>
      </AdminLayout>
    );
  }

  if (!template) {
    return (
      <AdminLayout title="Not Found">
        <div className="text-center py-8 text-muted-foreground">Template not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Edit Template: ${template.name}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/estimate-templates')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <LayoutTemplate className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{template.name}</h1>
                {template.description && (
                  <p className="text-muted-foreground">{template.description}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
            <Button 
              variant="secondary"
              onClick={() => {
                saveMutation.mutate(undefined, {
                  onSuccess: () => navigate('/admin/estimate-templates')
                });
              }} 
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save & Exit
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-6">
                <span><strong>Items:</strong> {totals.itemCount}</span>
                <span><strong>Base Cost:</strong> {formatCurrency(totals.subtotalCost)}</span>
                <span><strong>Job Type:</strong> {template.job_type.replace(/_/g, ' ')}</span>
                <span><strong>Heating:</strong> {template.heating_type.replace(/_/g, ' ')}</span>
                <span><strong>Margin:</strong> {((Number(template.profit_margin) - 1) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items by Section */}
        <div className="space-y-4">
          {SECTION_CONFIGS.map((config) => {
            const sectionItems = activeLineItems
              .filter(item => (item.section || getDefaultSection(item.item_type)) === config.key)
              .sort((a, b) => a.sort_order - b.sort_order);

            return (
              <EstimateSectionComponent
                key={config.key}
                config={config}
                items={sectionItems}
                onAddItem={handleSectionAddItem}
                onRemoveItem={handleRemoveItem}
                onUpdateItem={handleUpdateItem}
                onReorderItems={handleReorderItems}
                getActualIndex={(item) => lineItems.findIndex(li => li === item || (li.id && li.id === item.id))}
              />
            );
          })}
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {addDialogType === 'equipment' && 'Add Equipment System'}
              {addDialogType === 'unit' && 'Add Individual Unit'}
              {addDialogType === 'material' && 'Add Material'}
              {addDialogType === 'labor' && 'Add Labor'}
              {addDialogType === 'admin_cost' && 'Add Admin Cost'}
            </DialogTitle>
          </DialogHeader>

          {addDialogType === 'equipment' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search equipment..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredEquipment.map((eq) => {
                  const totalPrice = parseFloat(eq.system_price as any) || 0;
                  return (
                    <div
                      key={eq.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => handleAddEquipment(eq)}
                    >
                      <div className="flex items-center gap-3">
                        <Wrench className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium">{eq.system_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {eq.system_type} • {eq.tonnage}T • SEER2: {eq.seer2}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-semibold">{formatCurrency(totalPrice)}</div>
                    </div>
                  );
                })}
                {filteredEquipment.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No equipment found</div>
                )}
              </div>
            </div>
          )}

          {/* Unit Equipment Search */}
          {addDialogType === 'unit' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by brand, model, or type..."
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredUnits.map((unit: any) => (
                  <div
                    key={unit.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handleAddUnit(unit)}
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="font-medium">{unit.brand} {unit.model_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {unit.type} • {unit.size}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-semibold">{formatCurrency(Number(unit.price))}</div>
                  </div>
                ))}
                {filteredUnits.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No individual equipment found</div>
                )}
              </div>
            </div>
          )}

          {addDialogType === 'material' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select value={materialCategory} onValueChange={setMaterialCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Categories" />
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
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => {
                      handleAddMaterial(mat, currentAddSection);
                      setIsAddDialogOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium">{mat.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {mat.category} • {mat.unit}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-semibold">{formatCurrency(Number(mat.unit_cost))}</div>
                  </div>
                ))}
                {filteredMaterials.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No materials found</div>
                )}
              </div>
            </div>
          )}

          {addDialogType === 'labor' && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {laborRates.map((labor) => (
                <div
                  key={labor.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => {
                    handleAddLabor(labor);
                    setIsAddDialogOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-amber-500" />
                    <div>
                      <div className="font-medium">{labor.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {labor.rate_type} rate
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-semibold">{formatCurrency(Number(labor.rate))}</div>
                </div>
              ))}
              {laborRates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No labor rates found</div>
              )}
            </div>
          )}

          {addDialogType === 'admin_cost' && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {adminCosts.map((cost) => {
                const isAdded = lineItems.some(item => item.admin_cost_id === cost.id && !item.isDeleted);
                return (
                  <div
                    key={cost.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      isAdded ? 'opacity-50' : 'hover:bg-muted cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!isAdded) {
                        handleAddAdminCost(cost);
                        setIsAddDialogOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="h-5 w-5 text-purple-500" />
                      <div>
                        <div className="font-medium">
                          {cost.name}
                          {cost.is_required && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Required</span>
                          )}
                          {isAdded && (
                            <span className="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Added</span>
                          )}
                        </div>
                        {cost.description && (
                          <div className="text-sm text-muted-foreground">{cost.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="font-mono font-semibold">{formatCurrency(Number(cost.amount))}</div>
                  </div>
                );
              })}
              {adminCosts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No admin costs found</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default TemplateBuilder;
