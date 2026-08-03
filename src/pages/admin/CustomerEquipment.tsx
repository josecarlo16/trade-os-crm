import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Award, Zap, Flame, Snowflake, Ruler, Download, Upload, Copy, GripVertical } from "lucide-react";
import { useSoftDelete } from "@/hooks/useSoftDelete";
import * as XLSX from "xlsx";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type JsonArrayStrings = string[];

type DuctedEquipment = {
  id: string;
  system_name: string | null;
  brand: string;
  tonnage: number;
  system_type: string;
  // Gas System Components
  condenser_model: string | null;
  furnace_model: string | null;
  evap_coil_model: string | null;
  // Heat Pump Components
  heat_pump_model: string | null;
  air_handler_model: string | null;
  heat_kit_model: string | null;
  // Thermostat
  thermostat_name: string | null;
  // Refrigerant
  refrigerant: string | null;
  // Efficiency Ratings
  seer2_rating: number | null;
  eer2_rating: number | null;
  hspf2_rating: number | null;
  // Pricing & metadata
  equipment_cost: number;
  installation_labor: number;
  warranty_years: number;
  is_best_value: boolean;
  is_energy_star: boolean;
  is_active: boolean;
  efficiency_tier_id: string | null;
  features: JsonArrayStrings | null;
  display_order: number;
};

type DuctedEfficiencyTier = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  seer_min: number;
  seer_max: number;
  features: JsonArrayStrings | null;
  sort_order: number;
  is_active: boolean;
};

type DuctedAddon = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  icon_name: string | null;
  is_popular: boolean;
  sort_order: number;
  is_active: boolean;
};

type SizingRule = {
  id: string;
  home_type: string;
  layout: string;
  sq_ft_min: number;
  sq_ft_max: number;
  recommended_tonnage: number;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

const formatMoney = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

const linesToArray = (value: string): string[] =>
  value.split("\n").map((s) => s.trim()).filter(Boolean);

const arrayToLines = (arr: unknown): string => {
  if (!Array.isArray(arr)) return "";
  return arr.map((s) => String(s)).join("\n");
};

const HOME_TYPES = [
  { value: "single_family", label: "Single Family" },
  { value: "townhouse", label: "Townhouse" },
  { value: "condo", label: "Condo" },
  { value: "mobile_home", label: "Mobile Home" },
  { value: "duplex", label: "Duplex" },
  { value: "other", label: "Other" },
];

const LAYOUTS = [
  { value: "1_story", label: "1 Story" },
  { value: "2_stories", label: "2 Stories" },
  { value: "3_stories", label: "3 Stories" },
  { value: "split_level", label: "Split Level" },
  { value: "basement", label: "Basement" },
  { value: "loft", label: "Loft" },
];

const TONNAGES = [1.5, 2, 2.5, 3, 3.5, 4, 5];

// Sortable row component for sizing rules
interface SortableSizingRowProps {
  rule: SizingRule;
  getHomeTypeLabel: (value: string) => string;
  getLayoutLabel: (value: string) => string;
  onEdit: (rule: SizingRule) => void;
  onClone: (rule: SizingRule) => void;
  onDelete: (rule: SizingRule) => void;
}

const SortableSizingRow = ({ rule, getHomeTypeLabel, getLayoutLabel, onEdit, onClone, onDelete }: SortableSizingRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <button {...attributes} {...listeners} className="cursor-grab touch-none p-1 hover:bg-muted rounded">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{getHomeTypeLabel(rule.home_type)}</TableCell>
      <TableCell>{getLayoutLabel(rule.layout)}</TableCell>
      <TableCell>{rule.sq_ft_min.toLocaleString()} - {rule.sq_ft_max.toLocaleString()}</TableCell>
      <TableCell className="font-medium">{rule.recommended_tonnage}T</TableCell>
      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{rule.notes || "—"}</TableCell>
      <TableCell>
        <span className={`px-2 py-0.5 rounded-full text-xs ${rule.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {rule.is_active ? "Active" : "Inactive"}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onClone(rule)} title="Duplicate">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(rule)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Sizing Rule?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will move the sizing rule for "{getHomeTypeLabel(rule.home_type)} - {getLayoutLabel(rule.layout)}" to trash. You can restore it from Settings → Trash Bin.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(rule)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Move to Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
};

const CustomerEquipment = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"equipment" | "tiers" | "addons" | "sizing">("equipment");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------- Equipment --------
  const equipmentQuery = useQuery({
    queryKey: ["ducted_equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ducted_equipment")
        .select("*")
        .order("display_order")
        .order("brand");
      if (error) throw error;
      return data as DuctedEquipment[];
    },
  });

  const tiersQuery = useQuery({
    queryKey: ["ducted_efficiency_tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ducted_efficiency_tiers")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as DuctedEfficiencyTier[];
    },
  });

  const addonsQuery = useQuery({
    queryKey: ["ducted_addons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ducted_addons")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as DuctedAddon[];
    },
  });

  const sizingQuery = useQuery({
    queryKey: ["ducted_tonnage_sizing_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ducted_tonnage_sizing_rules")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as SizingRule[];
    },
  });

  // Equipment Dialog State
  const [equipDialogOpen, setEquipDialogOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState<DuctedEquipment | null>(null);
  const [equipForm, setEquipForm] = useState({
    system_name: "",
    brand: "",
    tonnage: 3,
    system_type: "gas_system",
    // Gas System Components
    condenser_model: "",
    furnace_model: "",
    evap_coil_model: "",
    // Heat Pump Components
    heat_pump_model: "",
    air_handler_model: "",
    heat_kit_model: "",
    // Thermostat
    thermostat_name: "",
    // Refrigerant
    refrigerant: "",
    // Efficiency Ratings
    seer2_rating: "",
    eer2_rating: "",
    hspf2_rating: "",
    // Pricing
    equipment_cost: 0,
    installation_labor: 0,
    warranty_years: 10,
    is_best_value: false,
    is_energy_star: false,
    is_active: true,
    efficiency_tier_id: "",
    featuresText: "",
    display_order: 0,
  });

  const resetEquipForm = () => {
    setEditingEquip(null);
    setEquipForm({
      system_name: "",
      brand: "",
      tonnage: 3,
      system_type: "gas_system",
      condenser_model: "",
      furnace_model: "",
      evap_coil_model: "",
      heat_pump_model: "",
      air_handler_model: "",
      heat_kit_model: "",
      thermostat_name: "",
      refrigerant: "",
      seer2_rating: "",
      eer2_rating: "",
      hspf2_rating: "",
      equipment_cost: 0,
      installation_labor: 0,
      warranty_years: 10,
      is_best_value: false,
      is_energy_star: false,
      is_active: true,
      efficiency_tier_id: "",
      featuresText: "",
      display_order: 0,
    });
  };

  const openCreateEquip = () => {
    resetEquipForm();
    setEquipDialogOpen(true);
  };

  const openEditEquip = (e: DuctedEquipment) => {
    setEditingEquip(e);
    setEquipForm({
      system_name: e.system_name || "",
      brand: e.brand,
      tonnage: e.tonnage,
      system_type: e.system_type,
      condenser_model: e.condenser_model || "",
      furnace_model: e.furnace_model || "",
      evap_coil_model: e.evap_coil_model || "",
      heat_pump_model: e.heat_pump_model || "",
      air_handler_model: e.air_handler_model || "",
      heat_kit_model: e.heat_kit_model || "",
      thermostat_name: e.thermostat_name || "",
      refrigerant: e.refrigerant || "",
      seer2_rating: e.seer2_rating?.toString() || "",
      eer2_rating: e.eer2_rating?.toString() || "",
      hspf2_rating: e.hspf2_rating?.toString() || "",
      equipment_cost: e.equipment_cost,
      installation_labor: e.installation_labor,
      warranty_years: e.warranty_years,
      is_best_value: e.is_best_value,
      is_energy_star: e.is_energy_star,
      is_active: e.is_active,
      efficiency_tier_id: e.efficiency_tier_id || "",
      featuresText: arrayToLines(e.features),
      display_order: e.display_order,
    });
    setEquipDialogOpen(true);
  };

  const saveEquipMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        system_name: equipForm.system_name.trim() || null,
        brand: equipForm.brand.trim(),
        tonnage: Number(equipForm.tonnage),
        system_type: equipForm.system_type,
        // Gas System Components
        condenser_model: equipForm.condenser_model.trim() || null,
        furnace_model: equipForm.furnace_model.trim() || null,
        evap_coil_model: equipForm.evap_coil_model.trim() || null,
        // Heat Pump Components
        heat_pump_model: equipForm.heat_pump_model.trim() || null,
        air_handler_model: equipForm.air_handler_model.trim() || null,
        heat_kit_model: equipForm.heat_kit_model.trim() || null,
        // Thermostat
        thermostat_name: equipForm.thermostat_name.trim() || null,
        // Refrigerant
        refrigerant: equipForm.refrigerant.trim() || null,
        // Efficiency Ratings
        seer2_rating: equipForm.seer2_rating ? Number(equipForm.seer2_rating) : null,
        eer2_rating: equipForm.eer2_rating ? Number(equipForm.eer2_rating) : null,
        hspf2_rating: equipForm.hspf2_rating ? Number(equipForm.hspf2_rating) : null,
        // Pricing & metadata
        equipment_cost: Number(equipForm.equipment_cost),
        installation_labor: Number(equipForm.installation_labor),
        warranty_years: Number(equipForm.warranty_years),
        is_best_value: equipForm.is_best_value,
        is_energy_star: equipForm.is_energy_star,
        is_active: equipForm.is_active,
        efficiency_tier_id: equipForm.efficiency_tier_id || null,
        features: linesToArray(equipForm.featuresText),
        display_order: Number(equipForm.display_order),
      };

      if (!payload.brand) throw new Error("Brand is required");

      if (editingEquip) {
        const { error } = await supabase.from("ducted_equipment").update(payload).eq("id", editingEquip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ducted_equipment").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ducted_equipment"] });
      toast.success(editingEquip ? "System updated" : "System created");
      setEquipDialogOpen(false);
      resetEquipForm();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  const softDeleteEquipMutation = useSoftDelete({
    tableName: "ducted_equipment",
    queryKey: "ducted_equipment",
    itemLabel: "Equipment",
  });

  // Tier Dialog State
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<DuctedEfficiencyTier | null>(null);
  const [tierForm, setTierForm] = useState({
    name: "",
    display_name: "",
    description: "",
    seer_min: 14,
    seer_max: 16,
    featuresText: "",
    sort_order: 0,
    is_active: true,
  });

  const resetTierForm = () => {
    setEditingTier(null);
    setTierForm({
      name: "",
      display_name: "",
      description: "",
      seer_min: 14,
      seer_max: 16,
      featuresText: "",
      sort_order: 0,
      is_active: true,
    });
  };

  const openCreateTier = () => {
    resetTierForm();
    setTierDialogOpen(true);
  };

  const openEditTier = (t: DuctedEfficiencyTier) => {
    setEditingTier(t);
    setTierForm({
      name: t.name,
      display_name: t.display_name,
      description: t.description || "",
      seer_min: t.seer_min,
      seer_max: t.seer_max,
      featuresText: arrayToLines(t.features),
      sort_order: t.sort_order,
      is_active: t.is_active,
    });
    setTierDialogOpen(true);
  };

  const saveTierMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: tierForm.name.trim(),
        display_name: tierForm.display_name.trim(),
        description: tierForm.description.trim() || null,
        seer_min: Number(tierForm.seer_min),
        seer_max: Number(tierForm.seer_max),
        features: linesToArray(tierForm.featuresText),
        sort_order: Number(tierForm.sort_order),
        is_active: tierForm.is_active,
      };

      if (!payload.name || !payload.display_name) {
        throw new Error("Name and Display Name are required");
      }

      if (editingTier) {
        const { error } = await supabase.from("ducted_efficiency_tiers").update(payload).eq("id", editingTier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ducted_efficiency_tiers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ducted_efficiency_tiers"] });
      toast.success(editingTier ? "Tier updated" : "Tier created");
      setTierDialogOpen(false);
      resetTierForm();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  const softDeleteTierMutation = useSoftDelete({
    tableName: "ducted_efficiency_tiers",
    queryKey: "ducted_efficiency_tiers",
    itemLabel: "Efficiency Tier",
  });

  // Addon Dialog State
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<DuctedAddon | null>(null);
  const [addonForm, setAddonForm] = useState({
    name: "",
    description: "",
    price: 0,
    icon_name: "",
    is_popular: false,
    sort_order: 0,
    is_active: true,
  });

  const resetAddonForm = () => {
    setEditingAddon(null);
    setAddonForm({
      name: "",
      description: "",
      price: 0,
      icon_name: "",
      is_popular: false,
      sort_order: 0,
      is_active: true,
    });
  };

  const openCreateAddon = () => {
    resetAddonForm();
    setAddonDialogOpen(true);
  };

  const openEditAddon = (a: DuctedAddon) => {
    setEditingAddon(a);
    setAddonForm({
      name: a.name,
      description: a.description || "",
      price: a.price,
      icon_name: a.icon_name || "",
      is_popular: a.is_popular,
      sort_order: a.sort_order,
      is_active: a.is_active,
    });
    setAddonDialogOpen(true);
  };

  const saveAddonMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: addonForm.name.trim(),
        description: addonForm.description.trim() || null,
        price: Number(addonForm.price),
        icon_name: addonForm.icon_name.trim() || null,
        is_popular: addonForm.is_popular,
        sort_order: Number(addonForm.sort_order),
        is_active: addonForm.is_active,
      };

      if (!payload.name) throw new Error("Name is required");

      if (editingAddon) {
        const { error } = await supabase.from("ducted_addons").update(payload).eq("id", editingAddon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ducted_addons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ducted_addons"] });
      toast.success(editingAddon ? "Add-on updated" : "Add-on created");
      setAddonDialogOpen(false);
      resetAddonForm();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  const softDeleteAddonMutation = useSoftDelete({
    tableName: "ducted_addons",
    queryKey: "ducted_addons",
    itemLabel: "Add-on",
  });

  // Sizing Rules Dialog State
  const [sizingDialogOpen, setSizingDialogOpen] = useState(false);
  const [editingSizing, setEditingSizing] = useState<SizingRule | null>(null);
  const [sizingForm, setSizingForm] = useState({
    home_type: "single_family",
    layout: "1_story",
    sq_ft_min: 0,
    sq_ft_max: 1000,
    recommended_tonnage: 2,
    notes: "",
    is_active: true,
  });

  const resetSizingForm = () => {
    setEditingSizing(null);
    setSizingForm({
      home_type: "single_family",
      layout: "1_story",
      sq_ft_min: 0,
      sq_ft_max: 1000,
      recommended_tonnage: 2,
      notes: "",
      is_active: true,
    });
  };

  const openCreateSizing = () => {
    resetSizingForm();
    setSizingDialogOpen(true);
  };

  const openEditSizing = (s: SizingRule) => {
    setEditingSizing(s);
    setSizingForm({
      home_type: s.home_type,
      layout: s.layout,
      sq_ft_min: s.sq_ft_min,
      sq_ft_max: s.sq_ft_max,
      recommended_tonnage: s.recommended_tonnage,
      notes: s.notes || "",
      is_active: s.is_active,
    });
    setSizingDialogOpen(true);
  };

  const saveSizingMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        home_type: sizingForm.home_type,
        layout: sizingForm.layout,
        sq_ft_min: Number(sizingForm.sq_ft_min),
        sq_ft_max: Number(sizingForm.sq_ft_max),
        recommended_tonnage: Number(sizingForm.recommended_tonnage),
        notes: sizingForm.notes.trim() || null,
        is_active: sizingForm.is_active,
      };

      if (payload.sq_ft_min >= payload.sq_ft_max) {
        throw new Error("Sq Ft Min must be less than Sq Ft Max");
      }

      if (editingSizing) {
        const { error } = await supabase.from("ducted_tonnage_sizing_rules").update(payload).eq("id", editingSizing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ducted_tonnage_sizing_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ducted_tonnage_sizing_rules"] });
      toast.success(editingSizing ? "Sizing rule updated" : "Sizing rule created");
      setSizingDialogOpen(false);
      resetSizingForm();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  const softDeleteSizingMutation = useSoftDelete({
    tableName: "ducted_tonnage_sizing_rules",
    queryKey: "ducted_tonnage_sizing_rules",
    itemLabel: "Sizing Rule",
  });

  // Clone sizing rule mutation
  const cloneSizingMutation = useMutation({
    mutationFn: async (rule: SizingRule) => {
      const maxSortOrder = sizingQuery.data?.reduce((max, r) => Math.max(max, r.sort_order), 0) || 0;
      const { error } = await supabase.from("ducted_tonnage_sizing_rules").insert({
        home_type: rule.home_type,
        layout: rule.layout,
        sq_ft_min: rule.sq_ft_min,
        sq_ft_max: rule.sq_ft_max,
        recommended_tonnage: rule.recommended_tonnage,
        notes: rule.notes ? `${rule.notes} (copy)` : "(copy)",
        is_active: rule.is_active,
        sort_order: maxSortOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ducted_tonnage_sizing_rules"] });
      toast.success("Sizing rule duplicated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to duplicate"),
  });

  // Reorder sizing rules mutation
  const reorderSizingMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("ducted_tonnage_sizing_rules")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ducted_tonnage_sizing_rules"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to reorder"),
  });

  // Drag sensors for sizing rules
  const sizingSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSizingDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !sizingQuery.data) return;

    const oldIndex = sizingQuery.data.findIndex((r) => r.id === active.id);
    const newIndex = sizingQuery.data.findIndex((r) => r.id === over.id);

    const reordered = arrayMove(sizingQuery.data, oldIndex, newIndex);
    const updates = reordered.map((r, i) => ({ id: r.id, sort_order: i + 1 }));
    reorderSizingMutation.mutate(updates);
  };

  const getHomeTypeLabel = (value: string) => HOME_TYPES.find((h) => h.value === value)?.label || value;
  const getLayoutLabel = (value: string) => LAYOUTS.find((l) => l.value === value)?.label || value;

  const getTierName = (tierId: string | null) => {
    if (!tierId) return "—";
    const tier = tiersQuery.data?.find((t) => t.id === tierId);
    return tier?.display_name || "—";
  };

  // Import/Export Functions
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "System Name": "Premium Comfort Plus 3-Ton",
        "Brand": "Goodman",
        "Tonnage": 3,
        "System Type": "gas_system",
        "Condenser Model": "GSX140361",
        "Furnace Model": "GMVC960803BN",
        "Evap Coil Model": "CAPF3636B6",
        "Heat Pump Model": "",
        "Air Handler Model": "",
        "Heat Kit Model": "",
        "Thermostat Name": "Honeywell T6 Pro",
        "Refrigerant": "R-410A",
        "SEER2": 15.2,
        "EER2": 12.5,
        "HSPF2": "",
        "Equipment Cost": 3500,
        "Installation Labor": 1500,
        "Warranty Years": 10,
        "Is Best Value": "FALSE",
        "Is Energy Star": "TRUE",
        "Is Active": "TRUE",
        "Efficiency Tier": "Better",
        "Features": "10-Year Warranty|Quiet Operation|Variable Speed",
        "Display Order": 1,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Equipment Template");
    XLSX.writeFile(wb, "customer_equipment_template.xlsx");
    toast.success("Template downloaded");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      if (jsonData.length === 0) {
        toast.error("No data found in file");
        return;
      }

      // Column mapping (handles both human-readable and snake_case)
      const columnMap: Record<string, string> = {
        "System Name": "system_name",
        "system_name": "system_name",
        "Brand": "brand",
        "brand": "brand",
        "Tonnage": "tonnage",
        "tonnage": "tonnage",
        "System Type": "system_type",
        "system_type": "system_type",
        "Condenser Model": "condenser_model",
        "condenser_model": "condenser_model",
        "Furnace Model": "furnace_model",
        "furnace_model": "furnace_model",
        "Evap Coil Model": "evap_coil_model",
        "evap_coil_model": "evap_coil_model",
        "Heat Pump Model": "heat_pump_model",
        "heat_pump_model": "heat_pump_model",
        "Air Handler Model": "air_handler_model",
        "air_handler_model": "air_handler_model",
        "Heat Kit Model": "heat_kit_model",
        "heat_kit_model": "heat_kit_model",
        "Thermostat Name": "thermostat_name",
        "thermostat_name": "thermostat_name",
        "Refrigerant": "refrigerant",
        "refrigerant": "refrigerant",
        "SEER2": "seer2_rating",
        "seer2_rating": "seer2_rating",
        "EER2": "eer2_rating",
        "eer2_rating": "eer2_rating",
        "HSPF2": "hspf2_rating",
        "hspf2_rating": "hspf2_rating",
        "Equipment Cost": "equipment_cost",
        "equipment_cost": "equipment_cost",
        "Installation Labor": "installation_labor",
        "installation_labor": "installation_labor",
        "Warranty Years": "warranty_years",
        "warranty_years": "warranty_years",
        "Is Best Value": "is_best_value",
        "is_best_value": "is_best_value",
        "Is Energy Star": "is_energy_star",
        "is_energy_star": "is_energy_star",
        "Is Active": "is_active",
        "is_active": "is_active",
        "Efficiency Tier": "efficiency_tier",
        "efficiency_tier": "efficiency_tier",
        "Features": "features",
        "features": "features",
        "Display Order": "display_order",
        "display_order": "display_order",
      };

      // Parse boolean helper
      const parseBoolean = (val: unknown): boolean => {
        if (typeof val === "boolean") return val;
        if (typeof val === "string") {
          return val.toLowerCase() === "true" || val === "1" || val.toLowerCase() === "yes";
        }
        return Boolean(val);
      };

      // Parse number helper
      const parseNumber = (val: unknown): number | null => {
        if (val === null || val === undefined || val === "") return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
      };

      // Normalize system type
      const normalizeSystemType = (val: unknown): string => {
        const strVal = String(val || "").toLowerCase().trim();
        if (strVal.includes("heat") && strVal.includes("pump")) return "heat_pump";
        if (strVal === "heat_pump" || strVal === "heatpump") return "heat_pump";
        return "gas_system";
      };

      // Map rows to database format
      const mappedRows = jsonData.map((row) => {
        const mapped: Record<string, unknown> = {};
        
        for (const [key, value] of Object.entries(row)) {
          const dbKey = columnMap[key];
          if (dbKey) {
            mapped[dbKey] = value;
          }
        }

        // Resolve efficiency tier ID by name
        let tierIdValue: string | null = null;
        if (mapped.efficiency_tier) {
          const tierName = String(mapped.efficiency_tier).toLowerCase().trim();
          const tier = tiersQuery.data?.find(
            (t) => t.name.toLowerCase() === tierName || t.display_name.toLowerCase() === tierName
          );
          tierIdValue = tier?.id || null;
        }

        // Parse features from pipe-separated string
        let featuresArray: string[] = [];
        if (mapped.features && typeof mapped.features === "string") {
          featuresArray = mapped.features.split("|").map((s: string) => s.trim()).filter(Boolean);
        }

        return {
          system_name: mapped.system_name ? String(mapped.system_name).trim() : null,
          brand: String(mapped.brand || "").trim(),
          tonnage: parseNumber(mapped.tonnage) || 3,
          system_type: normalizeSystemType(mapped.system_type),
          condenser_model: mapped.condenser_model ? String(mapped.condenser_model).trim() : null,
          furnace_model: mapped.furnace_model ? String(mapped.furnace_model).trim() : null,
          evap_coil_model: mapped.evap_coil_model ? String(mapped.evap_coil_model).trim() : null,
          heat_pump_model: mapped.heat_pump_model ? String(mapped.heat_pump_model).trim() : null,
          air_handler_model: mapped.air_handler_model ? String(mapped.air_handler_model).trim() : null,
          heat_kit_model: mapped.heat_kit_model ? String(mapped.heat_kit_model).trim() : null,
          thermostat_name: mapped.thermostat_name ? String(mapped.thermostat_name).trim() : null,
          refrigerant: mapped.refrigerant ? String(mapped.refrigerant).trim() : null,
          seer2_rating: parseNumber(mapped.seer2_rating),
          eer2_rating: parseNumber(mapped.eer2_rating),
          hspf2_rating: parseNumber(mapped.hspf2_rating),
          equipment_cost: parseNumber(mapped.equipment_cost) || 0,
          installation_labor: parseNumber(mapped.installation_labor) || 0,
          warranty_years: parseNumber(mapped.warranty_years) || 10,
          is_best_value: parseBoolean(mapped.is_best_value),
          is_energy_star: parseBoolean(mapped.is_energy_star),
          is_active: mapped.is_active !== undefined ? parseBoolean(mapped.is_active) : true,
          efficiency_tier_id: tierIdValue,
          features: featuresArray,
          display_order: parseNumber(mapped.display_order) || 0,
        };
      });

      // Filter out rows without brand (required field)
      const validRows = mappedRows.filter((row) => row.brand);

      if (validRows.length === 0) {
        toast.error("No valid rows found (brand is required)");
        return;
      }

      // Bulk insert
      const { error } = await supabase.from("ducted_equipment").insert(validRows);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["ducted_equipment"] });
      toast.success(`Imported ${validRows.length} equipment records`);
    } catch (err) {
      console.error("Import error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to import file");
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <AdminLayout title="Customer Equipment">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customer Equipment</h1>
            <p className="text-sm text-muted-foreground">
              Manage ducted HVAC equipment, efficiency tiers, and add-ons for customer estimates.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="tiers">Efficiency Tiers</TabsTrigger>
            <TabsTrigger value="addons">Add-ons</TabsTrigger>
            <TabsTrigger value="sizing" className="flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5" />
              Sizing Rules
            </TabsTrigger>
          </TabsList>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">{equipmentQuery.data?.length || 0} records</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImportExcel}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Excel
                </Button>
                <Dialog open={equipDialogOpen} onOpenChange={(open) => { if (!open) resetEquipForm(); setEquipDialogOpen(open); }}>
                  <DialogTrigger asChild>
                    <Button onClick={openCreateEquip}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Equipment
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingEquip ? "Edit System" : "Add System"}</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    {/* System Name & Brand */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>System Name</Label>
                        <Input value={equipForm.system_name} onChange={(e) => setEquipForm((p) => ({ ...p, system_name: e.target.value }))} placeholder="Premium Comfort Plus 3-Ton" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Brand *</Label>
                        <Input value={equipForm.brand} onChange={(e) => setEquipForm((p) => ({ ...p, brand: e.target.value }))} placeholder="Goodman" />
                      </div>
                    </div>

                    {/* System Type, Tonnage, Tier */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>System Type</Label>
                        <Select value={equipForm.system_type} onValueChange={(v) => setEquipForm((p) => ({ ...p, system_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gas_system">Gas System</SelectItem>
                            <SelectItem value="heat_pump">Heat Pump</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Tonnage</Label>
                        <Select value={String(equipForm.tonnage)} onValueChange={(v) => setEquipForm((p) => ({ ...p, tonnage: Number(v) }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1.5, 2, 2.5, 3, 3.5, 4, 5].map((t) => (
                              <SelectItem key={t} value={String(t)}>{t} Ton</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Efficiency Tier</Label>
                        <Select value={equipForm.efficiency_tier_id} onValueChange={(v) => setEquipForm((p) => ({ ...p, efficiency_tier_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                          <SelectContent>
                            {tiersQuery.data?.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.display_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Component Model Numbers - Conditional */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        {equipForm.system_type === "gas_system" ? (
                          <>
                            <Flame className="h-4 w-4 text-orange-500" />
                            Gas System Components
                          </>
                        ) : (
                          <>
                            <Snowflake className="h-4 w-4 text-blue-500" />
                            Heat Pump Components
                          </>
                        )}
                      </h4>
                      
                      {equipForm.system_type === "gas_system" ? (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="grid gap-2">
                            <Label className="text-xs">Condenser Model #</Label>
                            <Input value={equipForm.condenser_model} onChange={(e) => setEquipForm((p) => ({ ...p, condenser_model: e.target.value }))} placeholder="GSX160361" />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs">Furnace Model #</Label>
                            <Input value={equipForm.furnace_model} onChange={(e) => setEquipForm((p) => ({ ...p, furnace_model: e.target.value }))} placeholder="GMVC960603BN" />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs">Evap Coil Model #</Label>
                            <Input value={equipForm.evap_coil_model} onChange={(e) => setEquipForm((p) => ({ ...p, evap_coil_model: e.target.value }))} placeholder="CAPF3642C6" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="grid gap-2">
                            <Label className="text-xs">Heat Pump Model #</Label>
                            <Input value={equipForm.heat_pump_model} onChange={(e) => setEquipForm((p) => ({ ...p, heat_pump_model: e.target.value }))} placeholder="GSZH503010" />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs">Air Handler Model #</Label>
                            <Input value={equipForm.air_handler_model} onChange={(e) => setEquipForm((p) => ({ ...p, air_handler_model: e.target.value }))} placeholder="ARUF37C14" />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs">Heat Kit Model #</Label>
                            <Input value={equipForm.heat_kit_model} onChange={(e) => setEquipForm((p) => ({ ...p, heat_kit_model: e.target.value }))} placeholder="HKR-10C" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Thermostat & Refrigerant */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Thermostat Name</Label>
                        <Input value={equipForm.thermostat_name} onChange={(e) => setEquipForm((p) => ({ ...p, thermostat_name: e.target.value }))} placeholder="Honeywell T6 Pro" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Refrigerant</Label>
                        <Input value={equipForm.refrigerant} onChange={(e) => setEquipForm((p) => ({ ...p, refrigerant: e.target.value }))} placeholder="R-410A" />
                      </div>
                    </div>

                    {/* Efficiency Ratings */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>SEER2 Rating</Label>
                        <Input type="number" step="0.1" value={equipForm.seer2_rating} onChange={(e) => setEquipForm((p) => ({ ...p, seer2_rating: e.target.value }))} placeholder="15.2" />
                      </div>
                      <div className="grid gap-2">
                        <Label>EER2 Rating</Label>
                        <Input type="number" step="0.1" value={equipForm.eer2_rating} onChange={(e) => setEquipForm((p) => ({ ...p, eer2_rating: e.target.value }))} placeholder="12.0" />
                      </div>
                      <div className="grid gap-2">
                        <Label>HSPF2 Rating</Label>
                        <Input type="number" step="0.1" value={equipForm.hspf2_rating} onChange={(e) => setEquipForm((p) => ({ ...p, hspf2_rating: e.target.value }))} placeholder="8.5" />
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Equipment Cost</Label>
                        <Input type="number" value={equipForm.equipment_cost} onChange={(e) => setEquipForm((p) => ({ ...p, equipment_cost: Number(e.target.value) }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Installation Labor</Label>
                        <Input type="number" value={equipForm.installation_labor} onChange={(e) => setEquipForm((p) => ({ ...p, installation_labor: Number(e.target.value) }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Warranty (years)</Label>
                        <Input type="number" value={equipForm.warranty_years} onChange={(e) => setEquipForm((p) => ({ ...p, warranty_years: Number(e.target.value) }))} />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Features (one per line)</Label>
                      <Textarea value={equipForm.featuresText} onChange={(e) => setEquipForm((p) => ({ ...p, featuresText: e.target.value }))} placeholder="Variable speed blower&#10;Two-stage compressor" rows={3} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Display Order</Label>
                        <Input type="number" value={equipForm.display_order} onChange={(e) => setEquipForm((p) => ({ ...p, display_order: Number(e.target.value) }))} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Switch checked={equipForm.is_best_value} onCheckedChange={(c) => setEquipForm((p) => ({ ...p, is_best_value: c }))} />
                        <Label>Best Value</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={equipForm.is_energy_star} onCheckedChange={(c) => setEquipForm((p) => ({ ...p, is_energy_star: c }))} />
                        <Label>Energy Star</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={equipForm.is_active} onCheckedChange={(c) => setEquipForm((p) => ({ ...p, is_active: c }))} />
                        <Label>Active</Label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setEquipDialogOpen(false)}>Cancel</Button>
                      <Button onClick={() => saveEquipMutation.mutate()} disabled={saveEquipMutation.isPending}>
                        {saveEquipMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>System Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tonnage</TableHead>
                    <TableHead>SEER2</TableHead>
                    <TableHead>EER2</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Labor</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipmentQuery.data?.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="max-w-[200px] truncate">{eq.system_name || `${eq.brand} ${eq.tonnage}T`}</span>
                          {eq.is_best_value && <Award className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                          {eq.is_energy_star && <Zap className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{eq.brand}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {eq.system_type === "gas_system" ? (
                            <Flame className="h-3.5 w-3.5 text-orange-500" />
                          ) : (
                            <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                          )}
                          <span className="text-xs">{eq.system_type === "gas_system" ? "Gas" : "HP"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{eq.tonnage}T</TableCell>
                      <TableCell>{eq.seer2_rating || "—"}</TableCell>
                      <TableCell>{eq.eer2_rating || "—"}</TableCell>
                      <TableCell className="text-xs">{getTierName(eq.efficiency_tier_id)}</TableCell>
                      <TableCell className="text-xs">{formatMoney(eq.equipment_cost)}</TableCell>
                      <TableCell className="text-xs">{formatMoney(eq.installation_labor)}</TableCell>
                      <TableCell className="font-medium">{formatMoney(eq.equipment_cost + eq.installation_labor)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${eq.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {eq.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditEquip(eq)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Equipment?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will move "{eq.system_name || `${eq.brand} ${eq.tonnage}T`}" to trash. You can restore it from Settings → Trash Bin.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => softDeleteEquipMutation.mutate({ id: eq.id, data: eq as unknown as Record<string, unknown> })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Move to Trash
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!equipmentQuery.data?.length && (
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No equipment configured</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Efficiency Tiers Tab */}
          <TabsContent value="tiers" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">{tiersQuery.data?.length || 0} records</div>
              <Dialog open={tierDialogOpen} onOpenChange={(open) => { if (!open) resetTierForm(); setTierDialogOpen(open); }}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateTier}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingTier ? "Edit Tier" : "Add Tier"}</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Name (internal)</Label>
                        <Input value={tierForm.name} onChange={(e) => setTierForm((p) => ({ ...p, name: e.target.value }))} placeholder="standard" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Display Name</Label>
                        <Input value={tierForm.display_name} onChange={(e) => setTierForm((p) => ({ ...p, display_name: e.target.value }))} placeholder="Standard Efficiency" />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Textarea value={tierForm.description} onChange={(e) => setTierForm((p) => ({ ...p, description: e.target.value }))} placeholder="Reliable and affordable" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>SEER Min</Label>
                        <Input type="number" value={tierForm.seer_min} onChange={(e) => setTierForm((p) => ({ ...p, seer_min: Number(e.target.value) }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>SEER Max</Label>
                        <Input type="number" value={tierForm.seer_max} onChange={(e) => setTierForm((p) => ({ ...p, seer_max: Number(e.target.value) }))} />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Features (one per line)</Label>
                      <Textarea value={tierForm.featuresText} onChange={(e) => setTierForm((p) => ({ ...p, featuresText: e.target.value }))} rows={3} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Sort Order</Label>
                        <Input type="number" value={tierForm.sort_order} onChange={(e) => setTierForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch checked={tierForm.is_active} onCheckedChange={(c) => setTierForm((p) => ({ ...p, is_active: c }))} />
                        <Label>Active</Label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setTierDialogOpen(false)}>Cancel</Button>
                      <Button onClick={() => saveTierMutation.mutate()} disabled={saveTierMutation.isPending}>
                        {saveTierMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>SEER Range</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiersQuery.data?.map((tier) => (
                    <TableRow key={tier.id}>
                      <TableCell className="font-medium">{tier.name}</TableCell>
                      <TableCell>{tier.display_name}</TableCell>
                      <TableCell>{tier.seer_min} - {tier.seer_max}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{Array.isArray(tier.features) ? tier.features.length : 0} features</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${tier.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {tier.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditTier(tier)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Efficiency Tier?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will move "{tier.display_name}" to trash. You can restore it from Settings → Trash Bin.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => softDeleteTierMutation.mutate({ id: tier.id, data: tier as unknown as Record<string, unknown> })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Move to Trash
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!tiersQuery.data?.length && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No tiers configured</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Add-ons Tab */}
          <TabsContent value="addons" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">{addonsQuery.data?.length || 0} records</div>
              <Dialog open={addonDialogOpen} onOpenChange={(open) => { if (!open) resetAddonForm(); setAddonDialogOpen(open); }}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateAddon}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Add-on
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingAddon ? "Edit Add-on" : "Add Add-on"}</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Name</Label>
                      <Input value={addonForm.name} onChange={(e) => setAddonForm((p) => ({ ...p, name: e.target.value }))} placeholder="Smart Thermostat" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Textarea value={addonForm.description} onChange={(e) => setAddonForm((p) => ({ ...p, description: e.target.value }))} placeholder="WiFi-enabled thermostat with app control" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Price</Label>
                        <Input type="number" value={addonForm.price} onChange={(e) => setAddonForm((p) => ({ ...p, price: Number(e.target.value) }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Icon Name (Lucide)</Label>
                        <Input value={addonForm.icon_name} onChange={(e) => setAddonForm((p) => ({ ...p, icon_name: e.target.value }))} placeholder="Thermometer" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Sort Order</Label>
                        <Input type="number" value={addonForm.sort_order} onChange={(e) => setAddonForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Switch checked={addonForm.is_popular} onCheckedChange={(c) => setAddonForm((p) => ({ ...p, is_popular: c }))} />
                        <Label>Popular</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={addonForm.is_active} onCheckedChange={(c) => setAddonForm((p) => ({ ...p, is_active: c }))} />
                        <Label>Active</Label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setAddonDialogOpen(false)}>Cancel</Button>
                      <Button onClick={() => saveAddonMutation.mutate()} disabled={saveAddonMutation.isPending}>
                        {saveAddonMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Popular</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addonsQuery.data?.map((addon) => (
                    <TableRow key={addon.id}>
                      <TableCell className="font-medium">{addon.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{addon.description}</TableCell>
                      <TableCell>{formatMoney(addon.price)}</TableCell>
                      <TableCell>{addon.is_popular ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${addon.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {addon.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditAddon(addon)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Add-on?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will move "{addon.name}" to trash. You can restore it from Settings → Trash Bin.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => softDeleteAddonMutation.mutate({ id: addon.id, data: addon as unknown as Record<string, unknown> })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Move to Trash
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!addonsQuery.data?.length && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No add-ons configured</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Sizing Rules Tab */}
          <TabsContent value="sizing" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">{sizingQuery.data?.length || 0} records</div>
              <Dialog open={sizingDialogOpen} onOpenChange={(open) => { if (!open) resetSizingForm(); setSizingDialogOpen(open); }}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateSizing}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingSizing ? "Edit Sizing Rule" : "Add Sizing Rule"}</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Home Type</Label>
                        <Select value={sizingForm.home_type} onValueChange={(v) => setSizingForm((p) => ({ ...p, home_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {HOME_TYPES.map((h) => (
                              <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Layout</Label>
                        <Select value={sizingForm.layout} onValueChange={(v) => setSizingForm((p) => ({ ...p, layout: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LAYOUTS.map((l) => (
                              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Sq Ft Min</Label>
                        <Input type="number" value={sizingForm.sq_ft_min} onChange={(e) => setSizingForm((p) => ({ ...p, sq_ft_min: Number(e.target.value) }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Sq Ft Max</Label>
                        <Input type="number" value={sizingForm.sq_ft_max} onChange={(e) => setSizingForm((p) => ({ ...p, sq_ft_max: Number(e.target.value) }))} />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Recommended Tonnage</Label>
                      <Select value={String(sizingForm.recommended_tonnage)} onValueChange={(v) => setSizingForm((p) => ({ ...p, recommended_tonnage: Number(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TONNAGES.map((t) => (
                            <SelectItem key={t} value={String(t)}>{t} Ton</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Notes</Label>
                      <Input value={sizingForm.notes} onChange={(e) => setSizingForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes about this rule" />
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch checked={sizingForm.is_active} onCheckedChange={(c) => setSizingForm((p) => ({ ...p, is_active: c }))} />
                      <Label>Active</Label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setSizingDialogOpen(false)}>Cancel</Button>
                      <Button onClick={() => saveSizingMutation.mutate()} disabled={saveSizingMutation.isPending}>
                        {saveSizingMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-md border">
              <DndContext sensors={sizingSensors} collisionDetection={closestCenter} onDragEnd={handleSizingDragEnd}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Home Type</TableHead>
                      <TableHead>Layout</TableHead>
                      <TableHead>Sq Ft Range</TableHead>
                      <TableHead>Tonnage</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[130px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext items={sizingQuery.data?.map((r) => r.id) || []} strategy={verticalListSortingStrategy}>
                      {sizingQuery.data?.map((rule) => (
                        <SortableSizingRow
                          key={rule.id}
                          rule={rule}
                          getHomeTypeLabel={getHomeTypeLabel}
                          getLayoutLabel={getLayoutLabel}
                          onEdit={openEditSizing}
                          onClone={(r) => cloneSizingMutation.mutate(r)}
                          onDelete={(r) => softDeleteSizingMutation.mutate({ id: r.id, data: r as unknown as Record<string, unknown> })}
                        />
                      ))}
                    </SortableContext>
                    {!sizingQuery.data?.length && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No sizing rules configured</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default CustomerEquipment;
