import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, Download, Upload, Pencil, Trash2, FileText, FileSpreadsheet, AlertTriangle, Copy, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { EquipmentDocumentsPanel } from '@/components/admin/equipment/EquipmentDocumentsPanel';
import { useEquipmentDocumentCounts } from '@/hooks/useEquipmentDocumentCounts';

interface EquipmentSystem {
  id: string;
  system_name: string;
  system_type: 'mini_split' | 'ducted';
  heating_source: 'gas_furnace' | 'heat_pump' | null;
  tonnage: number | null;
  ahri_number: string | null;
  refrigerant: 'R-32' | 'R-454b' | null;
  condenser_heat_pump_model: string | null;
  // Furnace fields (gas systems)
  furnace_model: string | null;
  furnace_price: number | null;
  furnace_btu_input: number | null;
  furnace_afue: number | null;
  // Air handler fields (heat pump systems)
  air_handler_model: string | null;
  air_handler_price: number | null;
  air_handler_cfm: number | null;
  // Common fields
  evap_coil_model: string | null;
  heat_kit: string | null;
  thermostat_model: string | null;
  thermostat_price: number | null;
  condenser_price: number | null;
  evap_coil_price: number | null;
  heat_kit_price: number | null;
  system_price: number | null;
  seer2: number | null;
  eer2: number | null;
  hspf2: number | null;
  capacity_btuh: number | null;
  notes: string | null;
  needs_migration_review: boolean;
  created_at: string;
  updated_at: string;
  // Deprecated fields (for migration)
  furnace_air_handler_model?: string | null;
  furnace_air_handler_price?: number | null;
  furnace_air_handler_size?: string | null;
}

interface PriceBook {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  category: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

type SystemFormData = Omit<EquipmentSystem, 'id' | 'created_at' | 'updated_at' | 'furnace_air_handler_model' | 'furnace_air_handler_price' | 'furnace_air_handler_size'>;

const defaultFormData: SystemFormData = {
  system_name: '',
  system_type: 'ducted',
  heating_source: null,
  tonnage: null,
  ahri_number: null,
  refrigerant: null,
  condenser_heat_pump_model: null,
  furnace_model: null,
  furnace_price: null,
  furnace_btu_input: null,
  furnace_afue: null,
  air_handler_model: null,
  air_handler_price: null,
  air_handler_cfm: null,
  evap_coil_model: null,
  heat_kit: null,
  thermostat_model: null,
  thermostat_price: null,
  condenser_price: null,
  evap_coil_price: null,
  heat_kit_price: null,
  system_price: null,
  seer2: null,
  eer2: null,
  hspf2: null,
  capacity_btuh: null,
  notes: null,
  needs_migration_review: false,
};

const SystemPricing = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<EquipmentSystem | null>(null);
  const [formData, setFormData] = useState<SystemFormData>(defaultFormData);
  const [docsSheetFor, setDocsSheetFor] = useState<EquipmentSystem | null>(null);
  const { data: docMeta } = useEquipmentDocumentCounts('equipment_system');

  // Auto-calculate system price based on heating source
  useEffect(() => {
    if (formData.heating_source === 'gas_furnace') {
      const total = (formData.condenser_price || 0) + 
                   (formData.furnace_price || 0) + 
                   (formData.evap_coil_price || 0);
      if (total > 0) {
        setFormData(prev => ({ ...prev, system_price: total }));
      }
    } else if (formData.heating_source === 'heat_pump') {
      const total = (formData.condenser_price || 0) + 
                   (formData.air_handler_price || 0) + 
                   (formData.evap_coil_price || 0) + 
                   (formData.heat_kit_price || 0);
      if (total > 0) {
        setFormData(prev => ({ ...prev, system_price: total }));
      }
    }
  }, [
    formData.heating_source, 
    formData.condenser_price, 
    formData.furnace_price, 
    formData.air_handler_price, 
    formData.evap_coil_price, 
    formData.heat_kit_price
  ]);

  // Fetch equipment systems
  const { data: systems = [], isLoading: systemsLoading } = useQuery({
    queryKey: ['equipment-systems', searchTerm, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('equipment_systems')
        .select('*')
        .order('system_name');

      if (searchTerm) {
        query = query.or(`system_name.ilike.%${searchTerm}%,ahri_number.ilike.%${searchTerm}%,condenser_heat_pump_model.ilike.%${searchTerm}%,furnace_model.ilike.%${searchTerm}%,air_handler_model.ilike.%${searchTerm}%`);
      }

      if (typeFilter !== 'all') {
        query = query.eq('system_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EquipmentSystem[];
    },
  });

  // Fetch price books
  const { data: priceBooks = [], isLoading: priceBooksLoading } = useQuery({
    queryKey: ['price-books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_books')
        .select('*')
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as PriceBook[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SystemFormData & { id?: string }) => {
      // Set needs_migration_review to false for new/updated records
      const submitData = { ...data, needs_migration_review: false };
      
      if (data.id) {
        const { id, ...updateData } = submitData;
        const { error } = await supabase
          .from('equipment_systems')
          .update(updateData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('equipment_systems')
          .insert(submitData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-systems'] });
      toast.success(editingSystem ? 'System updated successfully' : 'System added successfully');
      handleCloseForm();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_systems')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-systems'] });
      toast.success('System deleted successfully');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Price book upload mutation
  const uploadPriceBookMutation = useMutation({
    mutationFn: async (file: File) => {
      const filePath = `${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('price-books')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('price_books')
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
        });
      
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-books'] });
      toast.success('Price book uploaded successfully');
    },
    onError: (error) => {
      toast.error(`Upload error: ${error.message}`);
    },
  });

  // Delete price book mutation
  const deletePriceBookMutation = useMutation({
    mutationFn: async (priceBook: PriceBook) => {
      const { error: storageError } = await supabase.storage
        .from('price-books')
        .remove([priceBook.file_path]);
      
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('price_books')
        .delete()
        .eq('id', priceBook.id);
      
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-books'] });
      toast.success('Price book deleted successfully');
    },
    onError: (error) => {
      toast.error(`Delete error: ${error.message}`);
    },
  });

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingSystem(null);
    setFormData(defaultFormData);
  };

  const handleEdit = (system: EquipmentSystem) => {
    setEditingSystem(system);
    setFormData({
      system_name: system.system_name,
      system_type: system.system_type,
      heating_source: system.heating_source,
      tonnage: system.tonnage,
      ahri_number: system.ahri_number,
      refrigerant: system.refrigerant,
      condenser_heat_pump_model: system.condenser_heat_pump_model,
      furnace_model: system.furnace_model,
      furnace_price: system.furnace_price,
      furnace_btu_input: system.furnace_btu_input,
      furnace_afue: system.furnace_afue,
      air_handler_model: system.air_handler_model,
      air_handler_price: system.air_handler_price,
      air_handler_cfm: system.air_handler_cfm,
      evap_coil_model: system.evap_coil_model,
      heat_kit: system.heat_kit,
      thermostat_model: system.thermostat_model,
      thermostat_price: system.thermostat_price,
      condenser_price: system.condenser_price,
      evap_coil_price: system.evap_coil_price,
      heat_kit_price: system.heat_kit_price,
      system_price: system.system_price,
      seer2: system.seer2,
      eer2: system.eer2,
      hspf2: system.hspf2,
      capacity_btuh: system.capacity_btuh,
      notes: system.notes,
      needs_migration_review: system.needs_migration_review,
    });
    setIsFormOpen(true);
  };

  const handleDuplicate = (system: EquipmentSystem) => {
    setEditingSystem(null);
    setFormData({
      system_name: `${system.system_name} (Copy)`,
      system_type: system.system_type,
      heating_source: system.heating_source,
      tonnage: system.tonnage,
      ahri_number: system.ahri_number,
      refrigerant: system.refrigerant,
      condenser_heat_pump_model: system.condenser_heat_pump_model,
      furnace_model: system.furnace_model,
      furnace_price: system.furnace_price,
      furnace_btu_input: system.furnace_btu_input,
      furnace_afue: system.furnace_afue,
      air_handler_model: system.air_handler_model,
      air_handler_price: system.air_handler_price,
      air_handler_cfm: system.air_handler_cfm,
      evap_coil_model: system.evap_coil_model,
      heat_kit: system.heat_kit,
      thermostat_model: system.thermostat_model,
      thermostat_price: system.thermostat_price,
      condenser_price: system.condenser_price,
      evap_coil_price: system.evap_coil_price,
      heat_kit_price: system.heat_kit_price,
      system_price: system.system_price,
      seer2: system.seer2,
      eer2: system.eer2,
      hspf2: system.hspf2,
      capacity_btuh: system.capacity_btuh,
      notes: system.notes,
      needs_migration_review: false,
    });
    setIsFormOpen(true);
    toast.info('Editing copy — adjust details and save to create a new system');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.system_name) {
      toast.error('System name is required');
      return;
    }
    if (formData.system_type === 'ducted' && !formData.heating_source) {
      toast.error('Please select a heating source (Gas Furnace or Heat Pump)');
      return;
    }
    saveMutation.mutate(editingSystem ? { ...formData, id: editingSystem.id } : formData);
  };

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const templateData = [
      {
        'System Name': '',
        'System Type': 'ducted',
        'Heating Source': 'gas_furnace',
        'Tonnage': '',
        'AHRI Number': '',
        'Refrigerant': '',
        'Condenser/Heat Pump Model': '',
        'Condenser Price': '',
        'Furnace Model': '',
        'Furnace Price': '',
        'Furnace BTU Input': '',
        'Furnace AFUE': '',
        'Air Handler Model': '',
        'Air Handler Price': '',
        'Air Handler CFM': '',
        'Heat Kit': '',
        'Heat Kit Price': '',
        'Thermostat Model': '',
        'Thermostat Price': '',
        'Evap Coil Model': '',
        'Evap Coil Price': '',
        'SEER2': '',
        'EER2': '',
        'HSPF2': '',
        'System Price': '',
        'Capacity BTUh': '',
        'Notes': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipment Systems');
    XLSX.writeFile(wb, 'equipment-systems-template.xlsx');
    toast.success('Template downloaded');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Check for deprecated columns
        const hasDeprecatedColumns = jsonData.some((row: any) => 
          'Furnace/Air Handler Model' in row || 'furnace_air_handler_model' in row
        );
        
        if (hasDeprecatedColumns) {
          toast.warning('Import file uses deprecated columns. Please update to the new format with separate Furnace and Air Handler fields.');
        }

        const columnMap: Record<string, keyof SystemFormData> = {
          'System Name': 'system_name',
          'system_name': 'system_name',
          'System Type': 'system_type',
          'system_type': 'system_type',
          'Heating Source': 'heating_source',
          'heating_source': 'heating_source',
          'Tonnage': 'tonnage',
          'tonnage': 'tonnage',
          'AHRI Number': 'ahri_number',
          'ahri_number': 'ahri_number',
          'Refrigerant': 'refrigerant',
          'refrigerant': 'refrigerant',
          'Condenser/Heat Pump Model': 'condenser_heat_pump_model',
          'condenser_heat_pump_model': 'condenser_heat_pump_model',
          'Furnace Model': 'furnace_model',
          'furnace_model': 'furnace_model',
          'Furnace Price': 'furnace_price',
          'furnace_price': 'furnace_price',
          'Furnace BTU Input': 'furnace_btu_input',
          'furnace_btu_input': 'furnace_btu_input',
          'Furnace AFUE': 'furnace_afue',
          'furnace_afue': 'furnace_afue',
          'Air Handler Model': 'air_handler_model',
          'air_handler_model': 'air_handler_model',
          'Air Handler Price': 'air_handler_price',
          'air_handler_price': 'air_handler_price',
          'Air Handler CFM': 'air_handler_cfm',
          'air_handler_cfm': 'air_handler_cfm',
          'Evap Coil Model': 'evap_coil_model',
          'evap_coil_model': 'evap_coil_model',
          'Evap Coil Price': 'evap_coil_price',
          'evap_coil_price': 'evap_coil_price',
          'Heat Kit': 'heat_kit',
          'heat_kit': 'heat_kit',
          'Heat Kit Price': 'heat_kit_price',
          'heat_kit_price': 'heat_kit_price',
          'Thermostat Model': 'thermostat_model',
          'thermostat_model': 'thermostat_model',
          'Thermostat Price': 'thermostat_price',
          'thermostat_price': 'thermostat_price',
          'Condenser Price': 'condenser_price',
          'condenser_price': 'condenser_price',
          'System Price': 'system_price',
          'system_price': 'system_price',
          'SEER2': 'seer2',
          'seer2': 'seer2',
          'EER2': 'eer2',
          'eer2': 'eer2',
          'HSPF2': 'hspf2',
          'hspf2': 'hspf2',
          'Capacity BTUh': 'capacity_btuh',
          'capacity_btuh': 'capacity_btuh',
          'Notes': 'notes',
          'notes': 'notes',
        };

        const systems: SystemFormData[] = jsonData.map((row: any) => {
          const system: any = { ...defaultFormData };
          
          Object.keys(row).forEach((key) => {
            const mappedKey = columnMap[key];
            if (mappedKey) {
              let value = row[key];
              
              // Handle system_type normalization
              if (mappedKey === 'system_type') {
                value = String(value).toLowerCase().replace(/\s+/g, '_');
                if (value !== 'mini_split' && value !== 'ducted') {
                  value = 'ducted';
                }
              }
              
              // Handle heating_source normalization
              if (mappedKey === 'heating_source') {
                value = String(value).toLowerCase().replace(/\s+/g, '_');
                if (value !== 'gas_furnace' && value !== 'heat_pump') {
                  value = null;
                }
              }
              
              // Handle refrigerant normalization
              if (mappedKey === 'refrigerant') {
                const normalized = String(value).toUpperCase().replace(/\s+/g, '');
                if (normalized === 'R-32' || normalized === 'R32') {
                  value = 'R-32';
                } else if (normalized === 'R-454B' || normalized === 'R454B') {
                  value = 'R-454b';
                } else {
                  value = null;
                }
              }
              
              // Handle numeric fields
              if (['tonnage', 'condenser_price', 'furnace_price', 'air_handler_price', 
                   'evap_coil_price', 'heat_kit_price', 'thermostat_price', 'system_price', 'seer2', 'eer2', 
                   'hspf2', 'capacity_btuh', 'furnace_btu_input', 'furnace_afue', 'air_handler_cfm'].includes(mappedKey)) {
                value = value ? parseFloat(value) : null;
              }
              
              system[mappedKey] = value || null;
            }
          });
          
          return system as SystemFormData;
        });

        // Filter out invalid entries
        const validSystems = systems.filter(s => s.system_name);
        
        if (validSystems.length === 0) {
          toast.error('No valid systems found in the file');
          return;
        }

        const { error } = await supabase
          .from('equipment_systems')
          .insert(validSystems);

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['equipment-systems'] });
        toast.success(`Imported ${validSystems.length} systems successfully`);
      } catch (error: any) {
        toast.error(`Import error: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleUploadPriceBook = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    uploadPriceBookMutation.mutate(file);
    e.target.value = '';
  };

  const handleDownloadPriceBook = async (priceBook: PriceBook) => {
    const { data, error } = await supabase.storage
      .from('price-books')
      .download(priceBook.file_path);
    
    if (error) {
      toast.error('Download error');
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = priceBook.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const updateFormField = (field: keyof SystemFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Count systems needing migration review
  const systemsNeedingReview = systems.filter(s => s.needs_migration_review);

  return (
    <AdminLayout title="System Pricing">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">System Pricing</h1>
          {systemsNeedingReview.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {systemsNeedingReview.length} systems need migration review
            </Badge>
          )}
        </div>

        <Tabs defaultValue="equipment" className="space-y-4">
          <TabsList>
            <TabsTrigger value="equipment">Equipment Systems</TabsTrigger>
            <TabsTrigger value="pricebooks">Price Books</TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="space-y-4">
            {/* Search & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search systems..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ducted">Ducted</SelectItem>
                    <SelectItem value="mini_split">Mini Split</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </Button>
                <label>
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Import
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImportExcel}
                  />
                </label>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => { setEditingSystem(null); setFormData(defaultFormData); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add System
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingSystem ? 'Edit System' : 'Add New System'}</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="details">
                      <TabsList className="mb-4">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="documents" disabled={!editingSystem}>
                          <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                          Documents
                          {editingSystem && (docMeta?.counts.get(editingSystem.id) ?? 0) > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                              {docMeta!.counts.get(editingSystem.id)}
                            </Badge>
                          )}
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="details">
                        <form onSubmit={handleSubmit} className="space-y-6">
                          {/* Basic Info */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label htmlFor="system_name">System Name *</Label>
                            <Input
                              id="system_name"
                              value={formData.system_name}
                              onChange={(e) => updateFormField('system_name', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="system_type">System Type *</Label>
                            <Select 
                              value={formData.system_type} 
                              onValueChange={(value: 'mini_split' | 'ducted') => updateFormField('system_type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ducted">Ducted</SelectItem>
                                <SelectItem value="mini_split">Mini Split</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {formData.system_type === 'ducted' && (
                            <div>
                              <Label htmlFor="heating_source">Heating Source *</Label>
                              <Select 
                                value={formData.heating_source || ''} 
                                onValueChange={(value: 'gas_furnace' | 'heat_pump') => updateFormField('heating_source', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select heating source" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="gas_furnace">Gas Furnace (AC + Furnace)</SelectItem>
                                  <SelectItem value="heat_pump">Heat Pump (+ Air Handler)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div>
                            <Label htmlFor="tonnage">Tonnage</Label>
                            <Input
                              id="tonnage"
                              type="number"
                              step="0.5"
                              value={formData.tonnage ?? ''}
                              onChange={(e) => updateFormField('tonnage', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="ahri_number">AHRI Number</Label>
                            <Input
                              id="ahri_number"
                              value={formData.ahri_number ?? ''}
                              onChange={(e) => updateFormField('ahri_number', e.target.value || null)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="refrigerant">Refrigerant</Label>
                            <Select 
                              value={formData.refrigerant || ''} 
                              onValueChange={(value: 'R-32' | 'R-454b') => updateFormField('refrigerant', value || null)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select refrigerant" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="R-32">R-32</SelectItem>
                                <SelectItem value="R-454b">R-454b</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="capacity_btuh">Capacity (BTUh)</Label>
                            <Input
                              id="capacity_btuh"
                              type="number"
                              value={formData.capacity_btuh ?? ''}
                              onChange={(e) => updateFormField('capacity_btuh', e.target.value ? parseInt(e.target.value) : null)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Outdoor Unit */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Outdoor Unit</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="condenser_heat_pump_model">
                              {formData.heating_source === 'heat_pump' ? 'Heat Pump Model' : 'Condenser Model'}
                            </Label>
                            <Input
                              id="condenser_heat_pump_model"
                              value={formData.condenser_heat_pump_model ?? ''}
                              onChange={(e) => updateFormField('condenser_heat_pump_model', e.target.value || null)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="condenser_price">
                              {formData.heating_source === 'heat_pump' ? 'Heat Pump Price' : 'Condenser Price'}
                            </Label>
                            <Input
                              id="condenser_price"
                              type="number"
                              step="0.01"
                              value={formData.condenser_price ?? ''}
                              onChange={(e) => updateFormField('condenser_price', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Gas Furnace Section - Only show for gas_furnace */}
                      {formData.heating_source === 'gas_furnace' && (
                        <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                          <h3 className="font-semibold text-sm text-orange-700 dark:text-orange-400 uppercase tracking-wide">Gas Furnace</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="furnace_model">Furnace Model</Label>
                              <Input
                                id="furnace_model"
                                value={formData.furnace_model ?? ''}
                                onChange={(e) => updateFormField('furnace_model', e.target.value || null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="furnace_price">Furnace Price</Label>
                              <Input
                                id="furnace_price"
                                type="number"
                                step="0.01"
                                value={formData.furnace_price ?? ''}
                                onChange={(e) => updateFormField('furnace_price', e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="furnace_btu_input">BTU Input</Label>
                              <Input
                                id="furnace_btu_input"
                                type="number"
                                value={formData.furnace_btu_input ?? ''}
                                onChange={(e) => updateFormField('furnace_btu_input', e.target.value ? parseInt(e.target.value) : null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="furnace_afue">AFUE (%)</Label>
                              <Input
                                id="furnace_afue"
                                type="number"
                                step="0.1"
                                value={formData.furnace_afue ?? ''}
                                onChange={(e) => updateFormField('furnace_afue', e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Air Handler Section - Only show for heat_pump */}
                      {formData.heating_source === 'heat_pump' && (
                        <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                          <h3 className="font-semibold text-sm text-blue-700 dark:text-blue-400 uppercase tracking-wide">Air Handler</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="air_handler_model">Air Handler Model</Label>
                              <Input
                                id="air_handler_model"
                                value={formData.air_handler_model ?? ''}
                                onChange={(e) => updateFormField('air_handler_model', e.target.value || null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="air_handler_price">Air Handler Price</Label>
                              <Input
                                id="air_handler_price"
                                type="number"
                                step="0.01"
                                value={formData.air_handler_price ?? ''}
                                onChange={(e) => updateFormField('air_handler_price', e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="air_handler_cfm">CFM Rating</Label>
                              <Input
                                id="air_handler_cfm"
                                type="number"
                                value={formData.air_handler_cfm ?? ''}
                                onChange={(e) => updateFormField('air_handler_cfm', e.target.value ? parseInt(e.target.value) : null)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Evaporator Coil */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Evaporator Coil</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="evap_coil_model">Evap Coil Model</Label>
                            <Input
                              id="evap_coil_model"
                              value={formData.evap_coil_model ?? ''}
                              onChange={(e) => updateFormField('evap_coil_model', e.target.value || null)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="evap_coil_price">Evap Coil Price</Label>
                            <Input
                              id="evap_coil_price"
                              type="number"
                              step="0.01"
                              value={formData.evap_coil_price ?? ''}
                              onChange={(e) => updateFormField('evap_coil_price', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Heat Kit - Only show for heat_pump */}
                      {formData.heating_source === 'heat_pump' && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Electric Backup Heat</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="heat_kit">Heat Kit Model</Label>
                              <Input
                                id="heat_kit"
                                value={formData.heat_kit ?? ''}
                                onChange={(e) => updateFormField('heat_kit', e.target.value || null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="heat_kit_price">Heat Kit Price</Label>
                              <Input
                                id="heat_kit_price"
                                type="number"
                                step="0.01"
                                value={formData.heat_kit_price ?? ''}
                                onChange={(e) => updateFormField('heat_kit_price', e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Thermostat */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Thermostat</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="thermostat_model">Thermostat Model</Label>
                            <Input
                              id="thermostat_model"
                              value={formData.thermostat_model ?? ''}
                              onChange={(e) => updateFormField('thermostat_model', e.target.value || null)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="thermostat_price">Thermostat Price</Label>
                            <Input
                              id="thermostat_price"
                              type="number"
                              step="0.01"
                              value={formData.thermostat_price ?? ''}
                              onChange={(e) => updateFormField('thermostat_price', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Efficiency Ratings */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Efficiency Ratings</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="seer2">SEER2</Label>
                            <Input
                              id="seer2"
                              type="number"
                              step="0.1"
                              value={formData.seer2 ?? ''}
                              onChange={(e) => updateFormField('seer2', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="eer2">EER2</Label>
                            <Input
                              id="eer2"
                              type="number"
                              step="0.1"
                              value={formData.eer2 ?? ''}
                              onChange={(e) => updateFormField('eer2', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </div>
                          {formData.heating_source === 'heat_pump' && (
                            <div>
                              <Label htmlFor="hspf2">HSPF2</Label>
                              <Input
                                id="hspf2"
                                type="number"
                                step="0.1"
                                value={formData.hspf2 ?? ''}
                                onChange={(e) => updateFormField('hspf2', e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* System Price */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Total System Price</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="system_price">System Price (auto-calculated)</Label>
                            <Input
                              id="system_price"
                              type="number"
                              step="0.01"
                              value={formData.system_price ?? ''}
                              onChange={(e) => updateFormField('system_price', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {formData.heating_source === 'gas_furnace' 
                                ? 'Condenser + Furnace + Evap Coil' 
                                : formData.heating_source === 'heat_pump'
                                  ? 'Heat Pump + Air Handler + Evap Coil + Heat Kit'
                                  : 'Select heating source for auto-calculation'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-4">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes ?? ''}
                          onChange={(e) => updateFormField('notes', e.target.value || null)}
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleCloseForm}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={saveMutation.isPending}>
                          {saveMutation.isPending ? 'Saving...' : editingSystem ? 'Update' : 'Add System'}
                        </Button>
                      </div>
                        </form>
                      </TabsContent>
                      <TabsContent value="documents">
                        {editingSystem ? (
                          <EquipmentDocumentsPanel
                            ownerType="equipment_system"
                            ownerId={editingSystem.id}
                            ownerLabel={editingSystem.system_name}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground py-8 text-center">
                            Save the system first to attach documents.
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Systems Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>System Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tonnage</TableHead>
                    <TableHead>Indoor Unit</TableHead>
                    <TableHead>Ratings</TableHead>
                    <TableHead className="text-right">System Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : systems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No systems found. Add your first system or import from Excel.
                      </TableCell>
                    </TableRow>
                  ) : (
                    systems.map((system) => (
                      <TableRow key={system.id} className={system.needs_migration_review ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {system.system_name}
                            {system.needs_migration_review && (
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              system.system_type === 'mini_split' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {system.system_type === 'mini_split' ? 'Mini Split' : 'Ducted'}
                            </span>
                            {system.heating_source && (
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs ${
                                system.heating_source === 'gas_furnace'
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              }`}>
                                {system.heating_source === 'gas_furnace' ? 'Gas' : 'Heat Pump'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{system.tonnage ?? '-'}</TableCell>
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            {system.condenser_heat_pump_model && (
                              <div className="text-muted-foreground truncate max-w-[200px]" title={system.condenser_heat_pump_model}>
                                OD: {system.condenser_heat_pump_model}
                              </div>
                            )}
                            {system.furnace_model && (
                              <div className="text-orange-600 dark:text-orange-400 truncate max-w-[200px]" title={system.furnace_model}>
                                F: {system.furnace_model}
                                {system.furnace_afue && ` (${system.furnace_afue}% AFUE)`}
                              </div>
                            )}
                            {system.air_handler_model && (
                              <div className="text-blue-600 dark:text-blue-400 truncate max-w-[200px]" title={system.air_handler_model}>
                                AH: {system.air_handler_model}
                                {system.air_handler_cfm && ` (${system.air_handler_cfm} CFM)`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            {system.seer2 && <div>SEER2: {system.seer2}</div>}
                            {system.eer2 && <div>EER2: {system.eer2}</div>}
                            {system.hspf2 && <div>HSPF2: {system.hspf2}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(system.system_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDocsSheetFor(system)}
                              title="Documents"
                              className="relative"
                            >
                              <Paperclip className="h-4 w-4" />
                              {(docMeta?.counts.get(system.id) ?? 0) > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                                  {docMeta!.counts.get(system.id)}
                                </span>
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(system)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDuplicate(system)} title="Duplicate">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this system?')) {
                                  deleteMutation.mutate(system.id);
                                }
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="pricebooks" className="space-y-4">
            <div className="flex justify-end">
              <label>
                <Button size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PDF
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleUploadPriceBook}
                />
              </label>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceBooksLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : priceBooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No price books uploaded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    priceBooks.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-red-500" />
                            <span className="font-medium">{book.file_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(book.uploaded_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{formatFileSize(book.file_size)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDownloadPriceBook(book)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this price book?')) {
                                  deletePriceBookMutation.mutate(book);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Documents Sheet (row-level) */}
      <Sheet open={!!docsSheetFor} onOpenChange={(o) => !o && setDocsSheetFor(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> System Documents
            </SheetTitle>
            <SheetDescription>{docsSheetFor?.system_name}</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {docsSheetFor && (
              <EquipmentDocumentsPanel
                ownerType="equipment_system"
                ownerId={docsSheetFor.id}
                ownerLabel={docsSheetFor.system_name}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

export default SystemPricing;
