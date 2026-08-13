import { useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, ChevronDown, ChevronRight, ImageIcon } from "lucide-react";
import { UnitSizePricingTable } from "./components/UnitSizePricingTable";
import { ImageUpload } from "@/components/admin/ImageUpload";

type JsonArrayStrings = string[];

type DuctlessUnitType = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  base_price: number;
  benefits: JsonArrayStrings | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type DuctlessSystemTier = {
  id: string;
  name: string;
  display_name: string;
  tier_level: "good" | "better" | "best";
  description: string | null;
  price_multiplier: number;
  features: JsonArrayStrings | null;
  seer_rating: number | null;
  warranty_years: number;
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AddonPriceType = "fixed" | "per_zone";

type DuctlessAddon = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_type: AddonPriceType;
  icon_name: string | null;
  is_popular: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


const formatMoney = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

const linesToArray = (value: string): string[] =>
  value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

const arrayToLines = (arr: unknown): string => {
  if (!Array.isArray(arr)) return "";
  return arr.map((s) => String(s)).join("\n");
};

const DuctlessConfig = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"unitTypes" | "tiers" | "addons">("unitTypes");
  const [expandedUnitIds, setExpandedUnitIds] = useState<Set<string>>(new Set());

  const toggleUnitExpanded = (id: string) => {
    setExpandedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // -------- Unit Types --------
  const unitTypesQuery = useQuery({
    queryKey: ["ductless_unit_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ductless_unit_types")
        .select("*")
        .order("sort_order")
        .order("display_name");
      if (error) throw error;
      return data as DuctlessUnitType[];
    },
  });

  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<DuctlessUnitType | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: "",
    display_name: "",
    description: "",
    base_price: 0,
    benefitsText: "",
    image_url: "",
    sort_order: 0,
    is_active: true,
  });

  const resetUnitForm = () => {
    setEditingUnit(null);
    setUnitForm({
      name: "",
      display_name: "",
      description: "",
      base_price: 0,
      benefitsText: "",
      image_url: "",
      sort_order: 0,
      is_active: true,
    });
  };

  const openCreateUnit = () => {
    resetUnitForm();
    setUnitDialogOpen(true);
  };

  const openEditUnit = (u: DuctlessUnitType) => {
    setEditingUnit(u);
    setUnitForm({
      name: u.name,
      display_name: u.display_name,
      description: u.description || "",
      base_price: Number(u.base_price || 0),
      benefitsText: arrayToLines(u.benefits),
      image_url: u.image_url || "",
      sort_order: u.sort_order ?? 0,
      is_active: !!u.is_active,
    });
    setUnitDialogOpen(true);
  };

  const saveUnitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: unitForm.name.trim(),
        display_name: unitForm.display_name.trim(),
        description: unitForm.description.trim() || null,
        base_price: Number(unitForm.base_price || 0),
        benefits: linesToArray(unitForm.benefitsText),
        image_url: unitForm.image_url.trim() || null,
        sort_order: Number(unitForm.sort_order || 0),
        is_active: !!unitForm.is_active,
      };

      if (!payload.name || !payload.display_name) {
        throw new Error("Name and Display Name are required");
      }

      if (editingUnit) {
        const { error } = await supabase.from("ductless_unit_types").update(payload).eq("id", editingUnit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ductless_unit_types").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ductless_unit_types"] });
      toast.success(editingUnit ? "Unit type updated" : "Unit type created");
      setUnitDialogOpen(false);
      resetUnitForm();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ductless_unit_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ductless_unit_types"] });
      toast.success("Unit type deleted");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete"),
  });

  // -------- System Tiers --------
  const tiersQuery = useQuery({
    queryKey: ["ductless_system_tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ductless_system_tiers")
        .select("*")
        .order("sort_order")
        .order("display_name");
      if (error) throw error;
      return data as DuctlessSystemTier[];
    },
  });

  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<DuctlessSystemTier | null>(null);
  const [tierForm, setTierForm] = useState({
    name: "",
    display_name: "",
    tier_level: "good" as DuctlessSystemTier["tier_level"],
    description: "",
    price_multiplier: 1,
    featuresText: "",
    seer_rating: "",
    warranty_years: 5,
    is_featured: false,
    sort_order: 0,
    is_active: true,
  });

  const resetTierForm = () => {
    setEditingTier(null);
    setTierForm({
      name: "",
      display_name: "",
      tier_level: "good",
      description: "",
      price_multiplier: 1,
      featuresText: "",
      seer_rating: "",
      warranty_years: 5,
      is_featured: false,
      sort_order: 0,
      is_active: true,
    });
  };

  const openCreateTier = () => {
    resetTierForm();
    setTierDialogOpen(true);
  };

  const openEditTier = (t: DuctlessSystemTier) => {
    setEditingTier(t);
    setTierForm({
      name: t.name,
      display_name: t.display_name,
      tier_level: t.tier_level,
      description: t.description || "",
      price_multiplier: Number(t.price_multiplier || 1),
      featuresText: arrayToLines(t.features),
      seer_rating: t.seer_rating == null ? "" : String(t.seer_rating),
      warranty_years: Number(t.warranty_years || 5),
      is_featured: !!t.is_featured,
      sort_order: t.sort_order ?? 0,
      is_active: !!t.is_active,
    });
    setTierDialogOpen(true);
  };

  const saveTierMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: tierForm.name.trim(),
        display_name: tierForm.display_name.trim(),
        tier_level: tierForm.tier_level,
        description: tierForm.description.trim() || null,
        price_multiplier: Number(tierForm.price_multiplier || 1),
        features: linesToArray(tierForm.featuresText),
        seer_rating: tierForm.seer_rating.trim() ? Number(tierForm.seer_rating) : null,
        warranty_years: Number(tierForm.warranty_years || 5),
        is_featured: !!tierForm.is_featured,
        sort_order: Number(tierForm.sort_order || 0),
        is_active: !!tierForm.is_active,
      };

      if (!payload.name || !payload.display_name) {
        throw new Error("Name and Display Name are required");
      }

      if (editingTier) {
        const { error } = await supabase.from("ductless_system_tiers").update(payload).eq("id", editingTier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ductless_system_tiers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ductless_system_tiers"] });
      toast.success(editingTier ? "Tier updated" : "Tier created");
      setTierDialogOpen(false);
      resetTierForm();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  const deleteTierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ductless_system_tiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ductless_system_tiers"] });
      toast.success("Tier deleted");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete"),
  });

  // -------- Add-ons --------
  const addonsQuery = useQuery({
    queryKey: ["ductless_addons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ductless_addons")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as DuctlessAddon[];
    },
  });

  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<DuctlessAddon | null>(null);
  const [addonForm, setAddonForm] = useState({
    name: "",
    description: "",
    price: 0,
    price_type: "fixed" as AddonPriceType,
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
      price_type: "fixed",
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

  const openEditAddon = (a: DuctlessAddon) => {
    setEditingAddon(a);
    setAddonForm({
      name: a.name,
      description: a.description || "",
      price: Number(a.price || 0),
      price_type: a.price_type,
      icon_name: a.icon_name || "",
      is_popular: !!a.is_popular,
      sort_order: a.sort_order ?? 0,
      is_active: !!a.is_active,
    });
    setAddonDialogOpen(true);
  };

  const saveAddonMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: addonForm.name.trim(),
        description: addonForm.description.trim() || null,
        price: Number(addonForm.price || 0),
        price_type: addonForm.price_type,
        icon_name: addonForm.icon_name.trim() || null,
        is_popular: !!addonForm.is_popular,
        sort_order: Number(addonForm.sort_order || 0),
        is_active: !!addonForm.is_active,
      };

      if (!payload.name) throw new Error("Name is required");

      if (editingAddon) {
        const { error } = await supabase.from("ductless_addons").update(payload).eq("id", editingAddon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ductless_addons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ductless_addons"] });
      toast.success(editingAddon ? "Add-on updated" : "Add-on created");
      setAddonDialogOpen(false);
      resetAddonForm();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  const deleteAddonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ductless_addons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ductless_addons"] });
      toast.success("Add-on deleted");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete"),
  });


  return (
    <AdminLayout title="Ductless Configuration">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ductless Configuration</h1>
            <p className="text-sm text-muted-foreground">
              Manage indoor unit styles, system tiers, add-ons, and view estimator submissions.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="unitTypes">Unit Types</TabsTrigger>
            <TabsTrigger value="tiers">System Tiers</TabsTrigger>
            <TabsTrigger value="addons">Add-ons</TabsTrigger>
          </TabsList>

          {/* Unit Types */}
          <TabsContent value="unitTypes" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">{unitTypesQuery.data?.length || 0} records</div>
              <Dialog open={unitDialogOpen} onOpenChange={(open) => (open ? setUnitDialogOpen(true) : (setUnitDialogOpen(false), resetUnitForm()))}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateUnit}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Unit Type
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>{editingUnit ? "Edit Unit Type" : "Add Unit Type"}</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Name (internal)</Label>
                      <Input value={unitForm.name} onChange={(e) => setUnitForm((p) => ({ ...p, name: e.target.value }))} placeholder="wall_mount" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Display name</Label>
                      <Input
                        value={unitForm.display_name}
                        onChange={(e) => setUnitForm((p) => ({ ...p, display_name: e.target.value }))}
                        placeholder="Wall Mount"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Textarea
                        value={unitForm.description}
                        onChange={(e) => setUnitForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Short customer-facing description"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="grid gap-2">
                        <Label>Base price</Label>
                        <Input
                          type="number"
                          value={unitForm.base_price}
                          onChange={(e) => setUnitForm((p) => ({ ...p, base_price: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Sort order</Label>
                        <Input
                          type="number"
                          value={unitForm.sort_order}
                          onChange={(e) => setUnitForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="flex items-end justify-between rounded-md border p-3">
                        <div className="grid gap-1">
                          <Label>Active</Label>
                          <p className="text-xs text-muted-foreground">Show in estimator</p>
                        </div>
                        <Switch checked={unitForm.is_active} onCheckedChange={(v) => setUnitForm((p) => ({ ...p, is_active: v }))} />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Benefits (one per line)</Label>
                      <Textarea
                        value={unitForm.benefitsText}
                        onChange={(e) => setUnitForm((p) => ({ ...p, benefitsText: e.target.value }))}
                        placeholder="Most affordable option\nEasy installation\nQuiet operation"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Unit Image</Label>
                      <ImageUpload
                        bucketName="ductless-images"
                        currentUrl={unitForm.image_url || null}
                        folder="unit-types"
                        onUpload={(url) => setUnitForm((p) => ({ ...p, image_url: url }))}
                        onRemove={() => setUnitForm((p) => ({ ...p, image_url: "" }))}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => (setUnitDialogOpen(false), resetUnitForm())}>
                        Cancel
                      </Button>
                      <Button onClick={() => saveUnitMutation.mutate()} disabled={saveUnitMutation.isPending}>
                        {saveUnitMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {(unitTypesQuery.data || []).map((u) => (
                <Collapsible
                  key={u.id}
                  open={expandedUnitIds.has(u.id)}
                  onOpenChange={() => toggleUnitExpanded(u.id)}
                >
                  <div className="rounded-lg border">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-6 h-6">
                            {expandedUnitIds.has(u.id) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          {u.image_url ? (
                            <img
                              src={u.image_url}
                              alt={u.display_name}
                              className="w-10 h-10 object-cover rounded-md border flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{u.display_name}</div>
                            <div className="text-xs text-muted-foreground">{u.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Base: </span>
                            <span className="font-medium">{formatMoney(u.base_price)}</span>
                          </div>
                          <div className="text-sm">
                            {u.is_active ? (
                              <span className="text-green-600">Active</span>
                            ) : (
                              <span className="text-muted-foreground">Inactive</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="sm" onClick={() => openEditUnit(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Delete ${u.display_name}?`)) deleteUnitMutation.mutate(u.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t bg-muted/30 p-4">
                        <UnitSizePricingTable
                          unitTypeId={u.id}
                          unitTypeName={u.display_name}
                          basePrice={u.base_price}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}

              {unitTypesQuery.isLoading && (
                <div className="p-4 text-sm text-muted-foreground border rounded-lg">
                  Loading...
                </div>
              )}
            </div>
          </TabsContent>

          {/* System Tiers */}
          <TabsContent value="tiers" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">{tiersQuery.data?.length || 0} records</div>

              <Dialog open={tierDialogOpen} onOpenChange={(open) => (open ? setTierDialogOpen(true) : (setTierDialogOpen(false), resetTierForm()))}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateTier}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingTier ? "Edit System Tier" : "Add System Tier"}</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Name (internal)</Label>
                        <Input value={tierForm.name} onChange={(e) => setTierForm((p) => ({ ...p, name: e.target.value }))} placeholder="p_series" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Display name</Label>
                        <Input
                          value={tierForm.display_name}
                          onChange={(e) => setTierForm((p) => ({ ...p, display_name: e.target.value }))}
                          placeholder="P-Series Hyper-Heat"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="grid gap-2">
                        <Label>Level</Label>
                        <Select value={tierForm.tier_level} onValueChange={(v) => setTierForm((p) => ({ ...p, tier_level: v as any }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="better">Better</SelectItem>
                            <SelectItem value="best">Best</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Multiplier</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={tierForm.price_multiplier}
                          onChange={(e) => setTierForm((p) => ({ ...p, price_multiplier: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Warranty (years)</Label>
                        <Input
                          type="number"
                          value={tierForm.warranty_years}
                          onChange={(e) => setTierForm((p) => ({ ...p, warranty_years: Number(e.target.value) }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="grid gap-2">
                        <Label>SEER (optional)</Label>
                        <Input value={tierForm.seer_rating} onChange={(e) => setTierForm((p) => ({ ...p, seer_rating: e.target.value }))} placeholder="20.5" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Sort order</Label>
                        <Input
                          type="number"
                          value={tierForm.sort_order}
                          onChange={(e) => setTierForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="flex-1 rounded-md border p-3 flex items-center justify-between">
                          <div>
                            <Label>Active</Label>
                            <p className="text-xs text-muted-foreground">Show in estimator</p>
                          </div>
                          <Switch checked={tierForm.is_active} onCheckedChange={(v) => setTierForm((p) => ({ ...p, is_active: v }))} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Textarea value={tierForm.description} onChange={(e) => setTierForm((p) => ({ ...p, description: e.target.value }))} />
                    </div>

                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <Label>Featured</Label>
                        <p className="text-xs text-muted-foreground">Show "Best value" badge</p>
                      </div>
                      <Switch checked={tierForm.is_featured} onCheckedChange={(v) => setTierForm((p) => ({ ...p, is_featured: v }))} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Features (one per line)</Label>
                      <Textarea value={tierForm.featuresText} onChange={(e) => setTierForm((p) => ({ ...p, featuresText: e.target.value }))} />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => (setTierDialogOpen(false), resetTierForm())}>
                        Cancel
                      </Button>
                      <Button onClick={() => saveTierMutation.mutate()} disabled={saveTierMutation.isPending}>
                        {saveTierMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Multiplier</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tiersQuery.data || []).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.display_name}</div>
                        <div className="text-xs text-muted-foreground">{t.name}{t.is_featured ? " • Featured" : ""}</div>
                      </TableCell>
                      <TableCell className="capitalize">{t.tier_level}</TableCell>
                      <TableCell>{t.price_multiplier}×</TableCell>
                      <TableCell>{t.is_active ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditTier(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete ${t.display_name}?`)) deleteTierMutation.mutate(t.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {tiersQuery.isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Add-ons */}
          <TabsContent value="addons" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">{addonsQuery.data?.length || 0} records</div>

              <Dialog open={addonDialogOpen} onOpenChange={(open) => (open ? setAddonDialogOpen(true) : (setAddonDialogOpen(false), resetAddonForm()))}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateAddon}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Add-on
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingAddon ? "Edit Add-on" : "Add Add-on"}</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Name</Label>
                        <Input value={addonForm.name} onChange={(e) => setAddonForm((p) => ({ ...p, name: e.target.value }))} placeholder="kumo_cloud" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Icon (Lucide name)</Label>
                        <Input
                          value={addonForm.icon_name}
                          onChange={(e) => setAddonForm((p) => ({ ...p, icon_name: e.target.value }))}
                          placeholder="Wifi"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Textarea value={addonForm.description} onChange={(e) => setAddonForm((p) => ({ ...p, description: e.target.value }))} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="grid gap-2">
                        <Label>Price</Label>
                        <Input type="number" value={addonForm.price} onChange={(e) => setAddonForm((p) => ({ ...p, price: Number(e.target.value) }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Price type</Label>
                        <Select value={addonForm.price_type} onValueChange={(v) => setAddonForm((p) => ({ ...p, price_type: v as AddonPriceType }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="per_zone">Per zone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Sort order</Label>
                        <Input
                          type="number"
                          value={addonForm.sort_order}
                          onChange={(e) => setAddonForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <Label>Popular</Label>
                          <p className="text-xs text-muted-foreground">Highlight in estimator</p>
                        </div>
                        <Switch checked={addonForm.is_popular} onCheckedChange={(v) => setAddonForm((p) => ({ ...p, is_popular: v }))} />
                      </div>
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <Label>Active</Label>
                          <p className="text-xs text-muted-foreground">Show in estimator</p>
                        </div>
                        <Switch checked={addonForm.is_active} onCheckedChange={(v) => setAddonForm((p) => ({ ...p, is_active: v }))} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => (setAddonDialogOpen(false), resetAddonForm())}>
                        Cancel
                      </Button>
                      <Button onClick={() => saveAddonMutation.mutate()} disabled={saveAddonMutation.isPending}>
                        {saveAddonMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(addonsQuery.data || []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.description}</div>
                      </TableCell>
                      <TableCell>{formatMoney(a.price)}</TableCell>
                      <TableCell>{a.price_type === "per_zone" ? "Per zone" : "Fixed"}{a.is_popular ? " • Popular" : ""}</TableCell>
                      <TableCell>{a.is_active ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditAddon(a)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete ${a.name}?`)) deleteAddonMutation.mutate(a.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {addonsQuery.isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default DuctlessConfig;
