import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useRestoreFromTrash, usePermanentDelete } from "@/hooks/useSoftDelete";
import { formatDistanceToNow, format } from "date-fns";
import { RotateCcw, Trash2, AlertTriangle, Archive } from "lucide-react";

interface TrashItem {
  id: string;
  original_table: string;
  original_id: string;
  data: Record<string, unknown>;
  deleted_by: string | null;
  deleted_at: string;
  expires_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  ducted_equipment: "Equipment",
  ducted_efficiency_tiers: "Efficiency Tiers",
  ducted_addons: "Add-ons",
  ducted_tonnage_sizing_rules: "Sizing Rules",
  ductless_addons: "Ductless Add-ons",
  ductless_system_tiers: "Ductless Tiers",
  ductless_unit_types: "Ductless Unit Types",
  blog_posts: "Blog Posts",
  gallery_images: "Gallery Images",
  materials_catalog: "Materials",
  labor_rates: "Labor Rates",
  admin_costs: "Admin Costs",
  // Submissions
  contact_submissions: "Contact Submission",
  landing_page_submissions: "Landing Page Submission",
  ductless_estimate_submissions: "Ductless Submission",
  ducted_estimate_submissions: "Ducted Submission",
  equipment_scans: "Scanner Submission",
};

const getTableLabel = (tableName: string) => TABLE_LABELS[tableName] || tableName;

const getItemName = (data: Record<string, unknown>): string => {
  // Try submission-specific name fields first
  if (data.customer_name && typeof data.customer_name === "string") {
    return data.customer_name as string;
  }
  if (data.first_name && data.last_name) {
    return `${data.first_name} ${data.last_name}`;
  }
  if (data.customer_email && typeof data.customer_email === "string") {
    return data.customer_email as string;
  }
  if (data.email && typeof data.email === "string") {
    return data.email as string;
  }
  // Try common name fields
  const nameFields = ["name", "system_name", "title", "display_name", "brand"];
  for (const field of nameFields) {
    if (data[field] && typeof data[field] === "string") {
      return data[field] as string;
    }
  }
  // Fallback to ID
  return data.id ? `ID: ${String(data.id).slice(0, 8)}...` : "Unknown item";
};

const TrashBin = () => {
  const [filterTable, setFilterTable] = useState<string>("all");
  const restoreMutation = useRestoreFromTrash();
  const permanentDeleteMutation = usePermanentDelete();

  const trashQuery = useQuery({
    queryKey: ["trash_bin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trash_bin")
        .select("*")
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data as TrashItem[];
    },
  });

  // Get unique tables for filter
  const uniqueTables = [...new Set(trashQuery.data?.map((item) => item.original_table) || [])];

  // Filter items
  const filteredItems = trashQuery.data?.filter((item) =>
    filterTable === "all" ? true : item.original_table === filterTable
  ) || [];

  const handleRestore = (item: TrashItem) => {
    restoreMutation.mutate({
      trashId: item.id,
      originalTable: item.original_table,
      data: item.data,
    });
  };

  const handlePermanentDelete = (trashId: string) => {
    permanentDeleteMutation.mutate(trashId);
  };

  return (
    <AdminLayout title="Trash Bin">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Archive className="h-6 w-6" />
              Trash Bin
            </h1>
            <p className="text-sm text-muted-foreground">
              View and restore deleted items. Items are automatically deleted after 30 days.
            </p>
          </div>
        </div>

        <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Items in the trash will be permanently deleted after 30 days. Restore them before expiration to keep your data.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} in trash
          </div>
          <Select value={filterTable} onValueChange={setFilterTable}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTables.map((table) => (
                <SelectItem key={table} value={table}>
                  {getTableLabel(table)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-muted">
                      {getTableLabel(item.original_table)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {getItemName(item.data)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(item.expires_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item)}
                        disabled={restoreMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The item will be permanently removed and cannot be recovered.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePermanentDelete(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Forever
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    <Archive className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Trash is empty</p>
                    <p className="text-xs mt-1">Deleted items will appear here</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default TrashBin;
