import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X, Pencil, Save, RotateCcw } from "lucide-react";

type DuctlessUnitSizePricing = {
  id: string;
  unit_type_id: string;
  size_tons: number;
  size_btu: number;
  price: number;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const formatMoney = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n || 0));

interface UnitSizePricingTableProps {
  unitTypeId: string;
  unitTypeName: string;
  basePrice: number;
}

export function UnitSizePricingTable({ unitTypeId, unitTypeName, basePrice }: UnitSizePricingTableProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  // Fetch size pricing for this unit type
  const sizePricingQuery = useQuery({
    queryKey: ["ductless_unit_size_pricing", unitTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ductless_unit_size_pricing")
        .select("*")
        .eq("unit_type_id", unitTypeId)
        .order("sort_order");
      if (error) throw error;
      return data as DuctlessUnitSizePricing[];
    },
  });

  // Update price mutation
  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase
        .from("ductless_unit_size_pricing")
        .update({ price, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ductless_unit_size_pricing", unitTypeId] });
      toast.success("Price updated");
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update price"),
  });

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase
        .from("ductless_unit_size_pricing")
        .update({ is_available, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ductless_unit_size_pricing", unitTypeId] });
      toast.success("Availability updated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update"),
  });

  // Set all to same price mutation
  const setAllSamePriceMutation = useMutation({
    mutationFn: async (price: number) => {
      const { error } = await supabase
        .from("ductless_unit_size_pricing")
        .update({ price, updated_at: new Date().toISOString() })
        .eq("unit_type_id", unitTypeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ductless_unit_size_pricing", unitTypeId] });
      toast.success("All prices updated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update prices"),
  });

  const startEdit = (item: DuctlessUnitSizePricing) => {
    setEditingId(item.id);
    setEditPrice(item.price);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPrice(0);
  };

  const saveEdit = (id: string) => {
    updatePriceMutation.mutate({ id, price: editPrice });
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      saveEdit(id);
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  if (sizePricingQuery.isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading sizes...</div>;
  }

  const sizes = sizePricingQuery.data || [];

  if (sizes.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No system sizes configured. Please contact support.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">System Sizes & Pricing</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAllSamePriceMutation.mutate(basePrice)}
          disabled={setAllSamePriceMutation.isPending}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset All to {formatMoney(basePrice)}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px]">Size</TableHead>
              <TableHead className="w-[100px]">BTU</TableHead>
              <TableHead className="w-[150px]">Price</TableHead>
              <TableHead className="w-[100px] text-center">Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sizes.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{item.size_tons}t</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.size_btu.toLocaleString()}
                </TableCell>
                <TableCell>
                  {editingId === item.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        className="h-8 w-24"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => saveEdit(item.id)}
                        disabled={updatePriceMutation.isPending}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={cancelEdit}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{formatMoney(item.price)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                        onClick={() => startEdit(item)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={item.is_available}
                    onCheckedChange={(checked) =>
                      toggleAvailabilityMutation.mutate({ id: item.id, is_available: checked })
                    }
                    disabled={toggleAvailabilityMutation.isPending}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Prices shown are per zone. Unavailable sizes will not be offered in the estimator.
      </p>
    </div>
  );
}
