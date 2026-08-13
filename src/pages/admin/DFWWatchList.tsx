import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Target, 
  Mail, 
  Phone, 
  Download, 
  Search,
  Flame,
  Users,
  CheckCircle,
  Calendar,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ScannerSubmissionDetail } from "@/components/admin/submissions/ScannerSubmissionDetail";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_AGE_FOR_WARM_LEAD = 12;

interface WarmLead {
  id: string;
  created_at: string | null;
  zip_code: string;
  city: string | null;
  state: string | null;
  brand: string | null;
  model_number: string;
  serial_number: string | null;
  manufactured_year: number | null;
  email: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  customer_address: string | null;
  status: string;
  is_dfw: boolean | null;
  tonnage: string | null;
  refrigerant: string | null;
  seer_rating: number | null;
  equipment_type: string | null;
  marketing_opt_in: boolean | null;
  breaker_size: string | null;
  voltage_info: string | null;
  fan_motor_info: string | null;
  compressor_info: string | null;
  factory_charge: string | null;
}

const getAgeBadgeColor = (age: number) => {
  if (age >= 20) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  if (age >= 15) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "contacted":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "converted":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "closed":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    default:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
  }
};

export default function DFWWatchList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contactFilter, setContactFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<WarmLead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: warmLeads, isLoading } = useQuery({
    queryKey: ["dfw_warm_leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_scans")
        .select("*")
        .eq("is_dfw", true)
        .not("manufactured_year", "is", null)
        .lte("manufactured_year", CURRENT_YEAR - MIN_AGE_FOR_WARM_LEAD)
        .order("manufactured_year", { ascending: true });

      if (error) throw error;
      return data as WarmLead[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("equipment_scans")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dfw_warm_leads"] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  // Calculate stats
  const stats = {
    total: warmLeads?.length || 0,
    withEmail: warmLeads?.filter((l) => l.email).length || 0,
    marketingOptIn: warmLeads?.filter((l) => l.marketing_opt_in).length || 0,
    avgAge: warmLeads?.length
      ? Math.round(
          warmLeads.reduce(
            (sum, l) => sum + (CURRENT_YEAR - (l.manufactured_year || CURRENT_YEAR)),
            0
          ) / warmLeads.length
        )
      : 0,
  };

  // Filter leads
  const filteredLeads = warmLeads?.filter((lead) => {
    const age = lead.manufactured_year ? CURRENT_YEAR - lead.manufactured_year : 0;

    // Search filter
    const matchesSearch =
      !searchTerm ||
      lead.zip_code.includes(searchTerm) ||
      lead.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.model_number.toLowerCase().includes(searchTerm.toLowerCase());

    // Age filter
    const matchesAge =
      ageFilter === "all" ||
      (ageFilter === "12-15" && age >= 12 && age < 15) ||
      (ageFilter === "15-20" && age >= 15 && age < 20) ||
      (ageFilter === "20+" && age >= 20);

    // Status filter
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;

    // Contact filter
    const matchesContact =
      contactFilter === "all" ||
      (contactFilter === "has-email" && lead.email) ||
      (contactFilter === "no-email" && !lead.email);

    return matchesSearch && matchesAge && matchesStatus && matchesContact;
  });

  const handleExportCSV = () => {
    if (!filteredLeads?.length) {
      toast.error("No leads to export");
      return;
    }

    const headers = [
      "Date",
      "Zip Code",
      "Brand",
      "Model",
      "Age",
      "Email",
      "Phone",
      "Status",
      "Marketing Opt-In",
    ];
    const rows = filteredLeads.map((lead) => [
      lead.created_at ? format(new Date(lead.created_at), "yyyy-MM-dd") : "",
      lead.zip_code,
      lead.brand || "",
      lead.model_number,
      lead.manufactured_year ? CURRENT_YEAR - lead.manufactured_year : "",
      lead.email || "",
      lead.customer_phone || "",
      lead.status,
      lead.marketing_opt_in ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dfw-warm-leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleViewLead = (lead: WarmLead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  return (
    <AdminLayout title="DFW Watch List">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold">DFW Watch List</h1>
              <p className="text-muted-foreground">
                Warm leads with equipment 12+ years old in your service area
              </p>
            </div>
          </div>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Email</CardTitle>
              <Mail className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withEmail}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0}% contactable
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Marketing Opt-In</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.marketingOptIn}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Equipment Age</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgAge} years</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search zip, brand, email, model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Age Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ages</SelectItem>
                  <SelectItem value="12-15">12-15 years</SelectItem>
                  <SelectItem value="15-20">15-20 years</SelectItem>
                  <SelectItem value="20+">20+ years</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={contactFilter} onValueChange={setContactFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="has-email">Has Email</SelectItem>
                  <SelectItem value="no-email">No Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Brand / Model</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading warm leads...
                    </TableCell>
                  </TableRow>
                ) : filteredLeads?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No warm leads found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads?.map((lead) => {
                    const age = lead.manufactured_year
                      ? CURRENT_YEAR - lead.manufactured_year
                      : null;
                    return (
                      <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={() => handleViewLead(lead)}>
                          {lead.created_at
                            ? format(new Date(lead.created_at), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell onClick={() => handleViewLead(lead)}>
                          <div>
                            <span className="font-medium">{lead.city || lead.zip_code}</span>
                            {lead.city && (
                              <p className="text-xs text-muted-foreground">{lead.zip_code}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => handleViewLead(lead)}>
                          <div>
                            <span className="font-medium">{lead.brand || "Unknown"}</span>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {lead.model_number}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell onClick={() => handleViewLead(lead)}>
                          {age !== null && (
                            <Badge className={getAgeBadgeColor(age)}>
                              {age} years
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell onClick={() => handleViewLead(lead)}>
                          <div className="flex items-center gap-2">
                            {lead.email && (
                              <Mail className="h-4 w-4 text-blue-500" />
                            )}
                            {lead.customer_phone && (
                              <Phone className="h-4 w-4 text-green-500" />
                            )}
                            {!lead.email && !lead.customer_phone && (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={lead.status}
                            onValueChange={(value) =>
                              updateStatus.mutate({ id: lead.id, status: value })
                            }
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <Badge className={getStatusColor(lead.status)}>
                                {lead.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="converted">Converted</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLead(lead)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Warm Lead Details
              </SheetTitle>
            </SheetHeader>
            {selectedLead && (
              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">Contact Information</h3>
                  {selectedLead.customer_name && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedLead.customer_name}</span>
                    </div>
                  )}
                  {selectedLead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <a href={`mailto:${selectedLead.email}`} className="text-blue-600 hover:underline">
                        {selectedLead.email}
                      </a>
                    </div>
                  )}
                  {selectedLead.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-500" />
                      <a href={`tel:${selectedLead.customer_phone}`} className="text-green-600 hover:underline">
                        {selectedLead.customer_phone}
                      </a>
                    </div>
                  )}
                  {!selectedLead.email && !selectedLead.customer_phone && !selectedLead.customer_name && (
                    <p className="text-muted-foreground text-sm">No contact information available</p>
                  )}
                </div>

                {/* Equipment Details */}
                <ScannerSubmissionDetail
                  metadata={{
                    zipCode: selectedLead.zip_code,
                    isDfw: selectedLead.is_dfw,
                    brand: selectedLead.brand,
                    modelNumber: selectedLead.model_number,
                    serialNumber: selectedLead.serial_number,
                    manufacturedYear: selectedLead.manufactured_year,
                    tonnage: selectedLead.tonnage,
                    refrigerant: selectedLead.refrigerant,
                    seerRating: selectedLead.seer_rating,
                    equipmentType: selectedLead.equipment_type,
                    marketingOptIn: selectedLead.marketing_opt_in,
                    customerAddress: selectedLead.customer_address,
                    breakerSize: selectedLead.breaker_size,
                    voltageInfo: selectedLead.voltage_info,
                    fanMotorInfo: selectedLead.fan_motor_info,
                    compressorInfo: selectedLead.compressor_info,
                    factoryCharge: selectedLead.factory_charge,
                  }}
                />

              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
