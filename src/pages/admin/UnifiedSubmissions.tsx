import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, X, Eye, Inbox, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { SubmissionDetailSheet } from "@/components/admin/submissions/SubmissionDetailSheet";
import { ExpandableEquipmentRow } from "@/components/admin/submissions/ExpandableEquipmentRow";
import { ExistingCustomerBadge } from "@/components/admin/submissions/ExistingCustomerBadge";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type SubmissionSource = "ducted" | "contact" | "landing_page" | "ductless" | "scanner";

export interface UnifiedSubmission {
  id: string;
  source: SubmissionSource;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  status: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

const sourceLabels: Record<SubmissionSource, string> = {
  ducted: "Ducted",
  contact: "Contact",
  landing_page: "Landing Page",
  ductless: "Ductless",
  scanner: "Scanner",
};

const sourceColors: Record<SubmissionSource, string> = {
  ducted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  contact: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  landing_page: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  ductless: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  scanner: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

// Map submission source to database table name
const sourceToTable: Record<SubmissionSource, string> = {
  ducted: "ducted_estimate_submissions",
  contact: "contact_submissions",
  landing_page: "landing_page_submissions",
  ductless: "ductless_estimate_submissions",
  scanner: "equipment_scans",
};

const UnifiedSubmissions = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<SubmissionSource | "all">("all");
  const [selectedSubmission, setSelectedSubmission] = useState<UnifiedSubmission | null>(null);

  // Fetch all submission types in parallel
  const contactQuery = useQuery({
    queryKey: ["contact_submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const landingPageQuery = useQuery({
    queryKey: ["landing_page_submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_page_submissions")
        .select(`*, form:landing_page_forms(name, slug)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const ductlessQuery = useQuery({
    queryKey: ["ductless_estimate_submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ductless_estimate_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const ductedQuery = useQuery({
    queryKey: ["ducted_estimate_submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ducted_estimate_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const scannerQuery = useQuery({
    queryKey: ["scanner_submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_scans")
        .select("*")
        .not("email", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Group scans by email to consolidate equipment per customer
      const groupedByEmail = new Map<string, typeof data>();
      data?.forEach(scan => {
        const email = scan.email?.toLowerCase();
        if (!email) return;
        
        if (!groupedByEmail.has(email)) {
          groupedByEmail.set(email, [scan]);
        } else {
          groupedByEmail.get(email)!.push(scan);
        }
      });
      
      return groupedByEmail;
    },
  });

  // Normalize all submissions into unified format
  const allSubmissions = useMemo<UnifiedSubmission[]>(() => {
    const unified: UnifiedSubmission[] = [];

    // Ducted submissions
    (ductedQuery.data || []).forEach((s) => {
      unified.push({
        id: s.id,
        source: "ducted",
        customerName: s.customer_name,
        customerEmail: s.customer_email,
        customerPhone: s.customer_phone,
        status: s.status || "new",
        createdAt: s.created_at,
        metadata: {
          address: s.customer_address,
          homeType: s.home_type,
          homeLayout: s.home_layout,
          squareFootage: s.square_footage,
          heatingType: s.heating_type,
          coverage: s.coverage,
          systemCount: s.system_count,
          recommendedTonnage: s.recommended_tonnage,
          equipmentCost: s.equipment_cost,
          installationCost: s.installation_cost,
          addonsCost: s.addons_cost,
          taxAmount: s.tax_amount,
          finalTotal: s.final_total,
          bestTimeToCall: s.best_time_to_call,
          selectedAddons: s.selected_addons,
          notes: s.notes,
        },
      });
    });

    // Contact submissions
    (contactQuery.data || []).forEach((s) => {
      unified.push({
        id: s.id,
        source: "contact",
        customerName: `${s.first_name} ${s.last_name}`,
        customerEmail: s.email,
        customerPhone: s.phone,
        status: s.status || "new",
        createdAt: s.created_at,
        metadata: {
          firstName: s.first_name,
          lastName: s.last_name,
          serviceType: s.service_type,
          message: s.message,
        },
      });
    });

    // Landing page submissions
    (landingPageQuery.data || []).forEach((s) => {
      unified.push({
        id: s.id,
        source: "landing_page",
        customerName: `${s.first_name} ${s.last_name}`,
        customerEmail: s.email,
        customerPhone: s.phone,
        status: s.status || "new",
        createdAt: s.created_at,
        metadata: {
          firstName: s.first_name,
          lastName: s.last_name,
          serviceType: s.service_type,
          message: s.message,
          formName: (s.form as any)?.name || null,
          formSlug: (s.form as any)?.slug || null,
          customFields: s.custom_fields,
        },
      });
    });

    // Ductless submissions
    (ductlessQuery.data || []).forEach((s) => {
      unified.push({
        id: s.id,
        source: "ductless",
        customerName: s.customer_name,
        customerEmail: s.customer_email,
        customerPhone: s.customer_phone,
        status: s.status || "new",
        createdAt: s.created_at,
        metadata: {
          address: s.customer_address,
          city: s.customer_city,
          state: s.customer_state,
          zip: s.customer_zip,
          county: s.customer_county,
          zoneCount: s.zone_count,
          selectedRooms: s.selected_rooms,
          unitTypeId: s.unit_type_id,
          systemTierId: s.system_tier_id,
          selectedAddons: s.selected_addons,
          subtotal: s.subtotal,
          taxAmount: s.tax_amount,
          rebates: s.rebates,
          finalTotal: s.final_total,
          notes: s.notes,
        },
      });
    });

    // Scanner submissions (grouped by email - one entry per customer)
    const scannerData = scannerQuery.data as Map<string, any[]> | undefined;
    scannerData?.forEach((scans, email) => {
      // Use the most recent scan for primary data
      const primaryScan = scans[0]; // Already sorted by created_at desc
      
      unified.push({
        id: primaryScan.id,
        source: "scanner",
        customerName: primaryScan.customer_name || "Unknown",
        customerEmail: email,
        customerPhone: primaryScan.customer_phone,
        status: primaryScan.status || "new",
        createdAt: primaryScan.created_at!,
        metadata: {
          // Include count of equipment scanned
          equipmentCount: scans.length,
          // Include array of all scanned equipment
          allEquipment: scans.map(s => ({
            id: s.id,
            brand: s.brand,
            modelNumber: s.model_number,
            serialNumber: s.serial_number,
            tonnage: s.tonnage,
            manufacturedYear: s.manufactured_year,
            equipmentType: s.equipment_type,
            refrigerant: s.refrigerant,
            seerRating: s.seer_rating,
          })),
          // Primary scan details for location info
          zipCode: primaryScan.zip_code,
          isDfw: primaryScan.is_dfw,
          marketingOptIn: primaryScan.marketing_opt_in,
          customerAddress: primaryScan.customer_address,
          city: primaryScan.city,
          state: primaryScan.state,
        },
      });
    });

    // Sort by date descending
    return unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ductedQuery.data, contactQuery.data, landingPageQuery.data, ductlessQuery.data, scannerQuery.data]);

  // Apply filters
  const filteredSubmissions = useMemo(() => {
    let filtered = [...allSubmissions];

    // Source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter((s) => s.source === sourceFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.customerName.toLowerCase().includes(query) ||
          s.customerEmail.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allSubmissions, sourceFilter, statusFilter, searchQuery]);

  // Status update mutations
  const onStatusError = (err: unknown) => {
    console.error("Status update failed:", err);
    toast.error("Couldn't update status", {
      description: err instanceof Error ? err.message : "Please try again.",
    });
  };
  const onStatusSuccess = () => toast.success("Status updated");

  const updateContactStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("contact_submissions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { onStatusSuccess(); queryClient.invalidateQueries({ queryKey: ["contact_submissions"] }); },
    onError: onStatusError,
  });

  const updateLandingPageStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("landing_page_submissions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { onStatusSuccess(); queryClient.invalidateQueries({ queryKey: ["landing_page_submissions"] }); },
    onError: onStatusError,
  });

  const updateDuctlessStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("ductless_estimate_submissions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { onStatusSuccess(); queryClient.invalidateQueries({ queryKey: ["ductless_estimate_submissions"] }); },
    onError: onStatusError,
  });

  const updateDuctedStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("ducted_estimate_submissions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { onStatusSuccess(); queryClient.invalidateQueries({ queryKey: ["ducted_estimate_submissions"] }); },
    onError: onStatusError,
  });

  const updateScannerStatus = useMutation({
    mutationFn: async ({ id, status, allEquipmentIds }: { id: string; status: string; allEquipmentIds?: string[] }) => {
      const idsToUpdate = allEquipmentIds || [id];
      const { error } = await supabase
        .from("equipment_scans")
        .update({ status })
        .in("id", idsToUpdate);
      if (error) throw error;
    },
    onSuccess: () => { onStatusSuccess(); queryClient.invalidateQueries({ queryKey: ["scanner_submissions"] }); },
    onError: onStatusError,
  });

  const handleStatusChange = (submission: UnifiedSubmission, newStatus: string) => {
    switch (submission.source) {
      case "ducted":
        updateDuctedStatus.mutate({ id: submission.id, status: newStatus });
        break;
      case "contact":
        updateContactStatus.mutate({ id: submission.id, status: newStatus });
        break;
      case "landing_page":
        updateLandingPageStatus.mutate({ id: submission.id, status: newStatus });
        break;
      case "ductless":
        updateDuctlessStatus.mutate({ id: submission.id, status: newStatus });
        break;
      case "scanner":
        // Get all equipment IDs from metadata to update them all
        const allEquipment = submission.metadata.allEquipment as Array<{ id: string }> | undefined;
        const allEquipmentIds = allEquipment?.map(e => e.id) || [submission.id];
        updateScannerStatus.mutate({ id: submission.id, status: newStatus, allEquipmentIds });
        break;
    }
  };

  // Delete mutation - soft delete to trash bin
  const deleteSubmission = useMutation({
    mutationFn: async (submission: UnifiedSubmission) => {
      const tableName = sourceToTable[submission.source];
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // For scanner, delete all equipment scans for this customer
      if (submission.source === "scanner") {
        const allEquipment = submission.metadata.allEquipment as Array<Record<string, unknown>> | undefined;
        const equipmentToDelete = allEquipment || [{ id: submission.id, ...submission.metadata }];
        
        for (const equip of equipmentToDelete) {
          // Get full record data
          const { data: fullRecord, error: fetchError } = await supabase
            .from("equipment_scans")
            .select("*")
            .eq("id", equip.id as string)
            .single();
          
          if (fetchError) throw fetchError;
          
          // Insert into trash_bin
          const { error: trashError } = await supabase
            .from("trash_bin")
            .insert({
              original_table: tableName,
              original_id: equip.id as string,
              data: fullRecord as Json,
              deleted_by: userId,
            });
          
          if (trashError) throw trashError;
          
          // Delete from original table
          const { error: deleteError } = await supabase
            .from("equipment_scans")
            .delete()
            .eq("id", equip.id as string);
          
          if (deleteError) throw deleteError;
        }
      } else {
        // Standard submission delete
        // First get the full record
        const { data: fullRecord, error: fetchError } = await supabase
          .from(tableName as "contact_submissions")
          .select("*")
          .eq("id", submission.id)
          .single();
        
        if (fetchError) throw fetchError;
        
        // Insert into trash_bin
        const { error: trashError } = await supabase
          .from("trash_bin")
          .insert({
            original_table: tableName,
            original_id: submission.id,
            data: fullRecord as Json,
            deleted_by: userId,
          });
        
        if (trashError) throw trashError;
        
        // Delete from original table
        const { error: deleteError } = await supabase
          .from(tableName as "contact_submissions")
          .delete()
          .eq("id", submission.id);
        
        if (deleteError) throw deleteError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["landing_page_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["ductless_estimate_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["ducted_estimate_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["scanner_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["trash_bin"] });
      setSelectedSubmission(null);
      toast.success("Submission moved to trash");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to delete submission");
    },
  });

  const handleDelete = (submission: UnifiedSubmission) => {
    deleteSubmission.mutate(submission);
  };

  const isLoading = ductedQuery.isLoading || contactQuery.isLoading || landingPageQuery.isLoading || ductlessQuery.isLoading || scannerQuery.isLoading;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "new":
        return "default";
      case "contacted":
      case "reviewed":
        return "secondary";
      case "converted":
      case "scheduled":
        return "outline";
      case "closed":
        return "outline";
      default:
        return "outline";
    }
  };

  // Count submissions by source
  const sourceCounts = useMemo(() => {
    const counts = { all: allSubmissions.length, ducted: 0, contact: 0, landing_page: 0, ductless: 0, scanner: 0 };
    allSubmissions.forEach((s) => counts[s.source]++);
    return counts;
  }, [allSubmissions]);

  if (isLoading) {
    return (
      <AdminLayout title="Submissions">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Submissions">
      <div className="space-y-4">
        {/* Source Tabs */}
        <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SubmissionSource | "all")} defaultValue="ducted">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">All ({sourceCounts.all})</TabsTrigger>
            <TabsTrigger value="ducted">Ducted ({sourceCounts.ducted})</TabsTrigger>
            <TabsTrigger value="contact">Contact ({sourceCounts.contact})</TabsTrigger>
            <TabsTrigger value="landing_page">Landing Page ({sourceCounts.landing_page})</TabsTrigger>
            <TabsTrigger value="ductless">Ductless ({sourceCounts.ductless})</TabsTrigger>
            <TabsTrigger value="scanner">Scanner ({sourceCounts.scanner})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="partial">Partial (Abandoned)</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="junk">Junk</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== "all") && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Showing {filteredSubmissions.length} of {allSubmissions.length} submissions
        </p>

        {/* Empty State */}
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No submissions found</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {filteredSubmissions.map((submission) => (
                <div
                  key={`${submission.source}-${submission.id}`}
                  onClick={() => setSelectedSubmission(submission)}
                  className="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {submission.customerName}
                      {submission.source === "scanner" && (submission.metadata.equipmentCount as number) > 1 && (
                        <Badge variant="outline" className="text-xs">
                          {submission.metadata.equipmentCount as number} units
                        </Badge>
                      )}
                    </div>
                    <Badge className={sourceColors[submission.source]} variant="secondary">
                      {sourceLabels[submission.source]}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-1 truncate">
                    {submission.customerEmail}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant={getStatusBadgeVariant(submission.status)}>
                      {submission.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {format(new Date(submission.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    submission.source === "scanner" ? (
                      <ExpandableEquipmentRow
                        key={`${submission.source}-${submission.id}`}
                        submission={submission}
                        sourceColors={sourceColors}
                        sourceLabels={sourceLabels}
                        onStatusChange={handleStatusChange}
                        onViewDetails={setSelectedSubmission}
                      />
                    ) : (
                      <TableRow
                        key={`${submission.source}-${submission.id}`}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <TableCell>
                          <Badge className={sourceColors[submission.source]} variant="secondary">
                            {sourceLabels[submission.source]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{submission.customerName}</span>
                            <ExistingCustomerBadge
                              email={submission.customerEmail}
                              phone={submission.customerPhone}
                              compact
                            />
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {submission.customerEmail}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={submission.status}
                            onValueChange={(value) => {
                              handleStatusChange(submission, value);
                            }}
                          >
                            <SelectTrigger
                              className="w-[120px] h-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="reviewed">Reviewed</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="converted">Converted</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                              <SelectItem value="junk">Junk</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(submission.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Submission?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will move the submission from {submission.customerName} to the trash bin. 
                                    You can restore it within 30 days.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(submission)}
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
                    )
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Detail Sheet */}
        <SubmissionDetailSheet
          submission={selectedSubmission}
          open={!!selectedSubmission}
          onOpenChange={(open) => !open && setSelectedSubmission(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </div>
    </AdminLayout>
  );
};

export default UnifiedSubmissions;
