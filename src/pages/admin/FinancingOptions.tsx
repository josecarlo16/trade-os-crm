import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Pencil, Plus, Trash2, Video } from "lucide-react";
import { SynchronyDisclosureGenerator } from "@/components/admin/financing/SynchronyDisclosureGenerator";

type FinancingOption = {
  id: string;
  plan_name: string;
  tran_code: string | null;
  promotional_offer: string;
  interest_rate: number;
  payment_factor: number;
  months_to_payoff: number | null;
  contractor_fee: number;
  dealer_net_cost: string | null;
  notes: string | null;
  applies_to: string[] | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const formatPercent = (n: number | null | undefined) =>
  n == null ? "N/A" : `${Number(n).toFixed(2)}%`;

const formatFactor = (n: number | null | undefined) =>
  n == null ? "N/A" : `${(Number(n) * 100).toFixed(3)}%`;

const FinancingOptions = () => {
  const queryClient = useQueryClient();

  const financingQuery = useQuery({
    queryKey: ["financing_options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_options")
        .select("*")
        .order("sort_order")
        .order("plan_name");
      if (error) throw error;
      return data as FinancingOption[];
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<FinancingOption | null>(null);
  const [form, setForm] = useState({
    plan_name: "",
    tran_code: "",
    promotional_offer: "",
    interest_rate: 0,
    payment_factor: 0,
    months_to_payoff: "",
    contractor_fee: 0,
    dealer_net_cost: "",
    notes: "",
    applies_to_ductless: true,
    applies_to_ducted: true,
    sort_order: 0,
    is_active: true,
  });

  const resetForm = () => {
    setEditingOption(null);
    setForm({
      plan_name: "",
      tran_code: "",
      promotional_offer: "",
      interest_rate: 0,
      payment_factor: 0,
      months_to_payoff: "",
      contractor_fee: 0,
      dealer_net_cost: "",
      notes: "",
      applies_to_ductless: true,
      applies_to_ducted: true,
      sort_order: 0,
      is_active: true,
    });
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (option: FinancingOption) => {
    setEditingOption(option);
    const appliesTo = option.applies_to || [];
    setForm({
      plan_name: option.plan_name,
      tran_code: option.tran_code || "",
      promotional_offer: option.promotional_offer,
      interest_rate: Number(option.interest_rate || 0),
      payment_factor: Number(option.payment_factor || 0),
      months_to_payoff: option.months_to_payoff == null ? "" : String(option.months_to_payoff),
      contractor_fee: Number(option.contractor_fee || 0),
      dealer_net_cost: option.dealer_net_cost || "",
      notes: option.notes || "",
      applies_to_ductless: appliesTo.includes("ductless"),
      applies_to_ducted: appliesTo.includes("ducted"),
      sort_order: option.sort_order ?? 0,
      is_active: !!option.is_active,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const appliesTo: string[] = [];
      if (form.applies_to_ductless) appliesTo.push("ductless");
      if (form.applies_to_ducted) appliesTo.push("ducted");

      const payload = {
        plan_name: form.plan_name.trim(),
        tran_code: form.tran_code.trim() || null,
        promotional_offer: form.promotional_offer.trim(),
        interest_rate: Number(form.interest_rate || 0),
        payment_factor: Number(form.payment_factor || 0),
        months_to_payoff: form.months_to_payoff.trim() ? Number(form.months_to_payoff) : null,
        contractor_fee: Number(form.contractor_fee || 0),
        dealer_net_cost: form.dealer_net_cost.trim() || null,
        notes: form.notes.trim() || null,
        applies_to: appliesTo,
        sort_order: Number(form.sort_order || 0),
        is_active: !!form.is_active,
      };

      if (!payload.plan_name || !payload.promotional_offer) {
        throw new Error("Plan Name and Promotional Offer are required");
      }

      if (editingOption) {
        const { error } = await supabase.from("financing_options").update(payload).eq("id", editingOption.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("financing_options").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financing_options"] });
      queryClient.invalidateQueries({ queryKey: ["financing_options_disclosure"] });
      toast.success(editingOption ? "Financing option updated" : "Financing option created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e?.message || "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financing_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financing_options"] });
      queryClient.invalidateQueries({ queryKey: ["financing_options_disclosure"] });
      toast.success("Financing option deleted");
    },
    onError: (e: Error) => toast.error(e?.message || "Failed to delete"),
  });

  return (
    <AdminLayout title="Financing Options">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financing Options</h1>
            <p className="text-sm text-muted-foreground">
              Manage financing plans for ductless and AC/Heat Pump estimators.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">{financingQuery.data?.length || 0} financing plans</div>
          <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : (setDialogOpen(false), resetForm()))}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Financing Option
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingOption ? "Edit Financing Option" : "Add Financing Option"}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Plan Name *</Label>
                    <Input
                      value={form.plan_name}
                      onChange={(e) => setForm((p) => ({ ...p, plan_name: e.target.value }))}
                      placeholder="Plan 600"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Transaction Code</Label>
                    <Input
                      value={form.tran_code}
                      onChange={(e) => setForm((p) => ({ ...p, tran_code: e.target.value }))}
                      placeholder="600"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Promotional Offer *</Label>
                  <Input
                    value={form.promotional_offer}
                    onChange={(e) => setForm((p) => ({ ...p, promotional_offer: e.target.value }))}
                    placeholder="9.99% APR Until Paid in Full"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.interest_rate}
                      onChange={(e) => setForm((p) => ({ ...p, interest_rate: Number(e.target.value) }))}
                      placeholder="9.99"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Payment Factor</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={form.payment_factor}
                      onChange={(e) => setForm((p) => ({ ...p, payment_factor: Number(e.target.value) }))}
                      placeholder="0.0125"
                    />
                    <p className="text-xs text-muted-foreground">Monthly payment = Amount × Factor</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Months to Payoff</Label>
                    <Input
                      type="number"
                      value={form.months_to_payoff}
                      onChange={(e) => setForm((p) => ({ ...p, months_to_payoff: e.target.value }))}
                      placeholder="132"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Contractor Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.contractor_fee}
                      onChange={(e) => setForm((p) => ({ ...p, contractor_fee: Number(e.target.value) }))}
                      placeholder="6.35"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Dealer Net Cost</Label>
                  <Input
                    value={form.dealer_net_cost}
                    onChange={(e) => setForm((p) => ({ ...p, dealer_net_cost: e.target.value }))}
                    placeholder="NO COST Elite, NO COST Preferred, 4.35% Diamond"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Additional notes about this financing option..."
                  />
                </div>

                <div className="space-y-3">
                  <Label>Applies To</Label>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="applies_ductless"
                        checked={form.applies_to_ductless}
                        onCheckedChange={(checked) => setForm((p) => ({ ...p, applies_to_ductless: !!checked }))}
                      />
                      <Label htmlFor="applies_ductless" className="font-normal cursor-pointer">Ductless Estimator</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="applies_ducted"
                        checked={form.applies_to_ducted}
                        onCheckedChange={(checked) => setForm((p) => ({ ...p, applies_to_ducted: !!checked }))}
                      />
                      <Label htmlFor="applies_ducted" className="font-normal cursor-pointer">AC | Heat Pump Estimator</Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => (setDialogOpen(false), resetForm())}>
                    Cancel
                  </Button>
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {financingQuery.isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : financingQuery.isError ? (
          <p className="text-destructive">Failed to load financing options</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Plan Name</TableHead>
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead>Promotional Offer</TableHead>
                  <TableHead className="w-[90px] text-right">APR</TableHead>
                  <TableHead className="w-[100px] text-right">Payment Factor</TableHead>
                  <TableHead className="w-[80px] text-right">Months</TableHead>
                  <TableHead className="w-[90px] text-right">Fee</TableHead>
                  <TableHead className="w-[80px] text-center">Active</TableHead>
                  <TableHead className="w-[80px] text-center">Ducted</TableHead>
                  <TableHead className="w-[80px] text-center">Ductless</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financingQuery.data?.map((option) => (
                  <TableRow key={option.id}>
                    <TableCell className="font-medium">{option.plan_name}</TableCell>
                    <TableCell>{option.tran_code || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={option.promotional_offer}>
                      {option.promotional_offer}
                    </TableCell>
                    <TableCell className="text-right">{formatPercent(option.interest_rate)}</TableCell>
                    <TableCell className="text-right">{formatFactor(option.payment_factor)}</TableCell>
                    <TableCell className="text-right">{option.months_to_payoff ?? "N/A"}</TableCell>
                    <TableCell className="text-right">{formatPercent(option.contractor_fee)}</TableCell>
                    <TableCell className="text-center">
                      <span className={option.is_active ? "text-green-600" : "text-muted-foreground"}>
                        {option.is_active ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={option.applies_to?.includes("ducted") ? "text-green-600" : "text-muted-foreground"}>
                        {option.applies_to?.includes("ducted") ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={option.applies_to?.includes("ductless") ? "text-green-600" : "text-muted-foreground"}>
                        {option.applies_to?.includes("ductless") ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(option)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this financing option?")) {
                              deleteMutation.mutate(option.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!financingQuery.data || financingQuery.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      No financing options found. Click "Add Financing Option" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Training Resources */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-semibold text-foreground">Training Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Submit Sales Slip
                </CardTitle>
              </CardHeader>
              <CardContent>
                <video
                  controls
                  className="w-full rounded-md"
                  src="/training/Submit_Sales_Slip_-_May_2025.mp4"
                  preload="metadata"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Synchrony Transaction Process
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 py-8">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <a href="/training/Syncrony_Transaction_Process.pdf" target="_blank" rel="noopener noreferrer">
                      Open PDF
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/training/Syncrony_Transaction_Process.pdf" download>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Sales Financing Process
                </CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  src="https://drive.google.com/file/d/136iFPIV2xXT-UHPQovowAcW_1Hp8DGwC/preview"
                  className="w-full rounded-md aspect-video"
                  allow="autoplay"
                  allowFullScreen
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Synchrony Disclosure Generator */}
        <div className="pt-4">
          <SynchronyDisclosureGenerator />
        </div>
      </div>
    </AdminLayout>
  );
};

export default FinancingOptions;
