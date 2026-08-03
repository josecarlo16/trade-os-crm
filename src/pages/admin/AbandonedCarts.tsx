import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Loader2, 
  Search, 
  X, 
  ShoppingCart, 
  Clock, 
  Calendar,
  Phone,
  Mail,
  Home,
  MapPin,
  User,
  CheckCircle,
  Trash2,
  ArrowRight,
  Settings,
  ChevronDown,
  FlaskConical,
  Info,
  ExternalLink,
} from "lucide-react";
import { format, formatDistanceToNow, startOfDay, subDays, isAfter } from "date-fns";
import { toast } from "sonner";

interface DuctedAbandonedCart {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string | null;
  best_time_to_call: string | null;
  home_type: string;
  home_layout: string;
  square_footage: string;
  heating_type: string;
  coverage: string;
  status: string;
  created_at: string;
}

interface DuctlessAbandonedCart {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  zone_count: number;
  status: string;
  created_at: string;
}

interface AbandonedCart {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  status: string;
  created_at: string;
  estimator_type: 'ducted' | 'ductless';
  // Ducted-specific fields
  best_time_to_call?: string | null;
  home_type?: string;
  home_layout?: string;
  square_footage?: string;
  heating_type?: string;
  coverage?: string;
  // Ductless-specific fields
  zone_count?: number;
}

const AbandonedCarts = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [isClearingTest, setIsClearingTest] = useState(false);

  // Fetch abandoned carts from BOTH ducted and ductless submissions
  const { data: abandonedCarts, isLoading } = useQuery({
    queryKey: ["abandoned-carts"],
    queryFn: async () => {
      // Fetch ducted abandoned carts
      const { data: ductedData, error: ductedError } = await supabase
        .from("ducted_estimate_submissions")
        .select("*")
        .eq("status", "partial")
        .order("created_at", { ascending: false });
      
      if (ductedError) throw ductedError;

      // Fetch ductless abandoned carts
      const { data: ductlessData, error: ductlessError } = await supabase
        .from("ductless_estimate_submissions")
        .select("*")
        .eq("status", "partial")
        .order("created_at", { ascending: false });
      
      if (ductlessError) throw ductlessError;

      // Merge and add estimator_type indicator
      const ducted: AbandonedCart[] = (ductedData || []).map((item: DuctedAbandonedCart) => ({
        ...item,
        estimator_type: 'ducted' as const,
      }));

      const ductless: AbandonedCart[] = (ductlessData || []).map((item: DuctlessAbandonedCart) => ({
        ...item,
        estimator_type: 'ductless' as const,
      }));

      // Combine and sort by created_at descending
      return [...ducted, ...ductless].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  // Update status mutation - now handles both estimator types
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, estimatorType }: { id: string; status: string; estimatorType: 'ducted' | 'ductless' }) => {
      const table = estimatorType === 'ductless' ? 'ductless_estimate_submissions' : 'ducted_estimate_submissions';
      const { error } = await supabase
        .from(table)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });
      queryClient.invalidateQueries({ queryKey: ["ducted_estimate_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["ductless_estimate_submissions"] });
      setSelectedCart(null);
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!abandonedCarts) return { today: 0, week: 0, month: 0, total: 0 };
    
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);

    return {
      today: abandonedCarts.filter(c => isAfter(new Date(c.created_at), todayStart)).length,
      week: abandonedCarts.filter(c => isAfter(new Date(c.created_at), weekAgo)).length,
      month: abandonedCarts.filter(c => isAfter(new Date(c.created_at), monthAgo)).length,
      total: abandonedCarts.length,
    };
  }, [abandonedCarts]);

  // Apply filters
  const filteredCarts = useMemo(() => {
    if (!abandonedCarts) return [];
    
    let filtered = [...abandonedCarts];

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let cutoff: Date;
      
      switch (dateFilter) {
        case "today":
          cutoff = startOfDay(now);
          break;
        case "week":
          cutoff = subDays(now, 7);
          break;
        case "month":
          cutoff = subDays(now, 30);
          break;
        default:
          cutoff = new Date(0);
      }
      
      filtered = filtered.filter(c => isAfter(new Date(c.created_at), cutoff));
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(query) ||
          c.customer_email.toLowerCase().includes(query) ||
          (c.customer_phone && c.customer_phone.includes(query))
      );
    }

    return filtered;
  }, [abandonedCarts, dateFilter, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
  };

  const handleMarkContacted = (cart: AbandonedCart) => {
    updateStatus.mutate({ id: cart.id, status: "contacted", estimatorType: cart.estimator_type });
  };

  const handleConvertToLead = (cart: AbandonedCart) => {
    updateStatus.mutate({ id: cart.id, status: "new", estimatorType: cart.estimator_type });
  };

  const handleMarkJunk = (cart: AbandonedCart) => {
    updateStatus.mutate({ id: cart.id, status: "junk", estimatorType: cart.estimator_type });
  };

  // Create test abandoned cart for testing purposes
  const handleCreateTestCart = async () => {
    setIsCreatingTest(true);
    try {
      const testData = {
        customer_name: "Test User",
        customer_email: `test-${Date.now()}@test.example.com`,
        customer_phone: "555-0100",
        customer_address: "123 Test Street, Dallas, TX 75001",
        best_time_to_call: "Morning",
        home_type: "single_family",
        home_layout: "1_story",
        square_footage: "2000_2400",
        heating_type: "gas_system",
        coverage: "entire_home",
        system_count: 1,
        status: "partial",
      };

      const { error } = await supabase
        .from("ducted_estimate_submissions")
        .insert(testData);

      if (error) throw error;
      
      toast.success("Test abandoned cart created successfully");
      queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });
    } catch (error) {
      console.error("Failed to create test cart:", error);
      toast.error("Failed to create test cart");
    } finally {
      setIsCreatingTest(false);
    }
  };

  // Clear test data (emails containing @test)
  const handleClearTestData = async () => {
    setIsClearingTest(true);
    try {
      const { error } = await supabase
        .from("ducted_estimate_submissions")
        .delete()
        .like("customer_email", "%@test%");

      if (error) throw error;
      
      toast.success("Test data cleared successfully");
      queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });
    } catch (error) {
      console.error("Failed to clear test data:", error);
      toast.error("Failed to clear test data");
    } finally {
      setIsClearingTest(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Abandoned Carts">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Abandoned Carts">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
              <p className="text-xs text-muted-foreground">abandoned carts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.week}</div>
              <p className="text-xs text-muted-foreground">abandoned carts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.month}</div>
              <p className="text-xs text-muted-foreground">abandoned carts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Time</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">total abandoned</p>
            </CardContent>
          </Card>
        </div>

        {/* Testing & Settings Panel */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Testing & Settings
                  </CardTitle>
                  <ChevronDown className={`h-4 w-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-6">
                {/* How It Works */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    How Abandoned Cart Tracking Works
                  </h4>
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-2">
                    <p>Abandoned carts are saved automatically when a user:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Reaches Step 8 (Contact Info) and enters at least email or phone</li>
                      <li><strong>Closes or navigates away from the tab</strong> (beforeunload/pagehide events)</li>
                      <li><strong>Switches to another tab or minimizes browser</strong> (visibilitychange event)</li>
                    </ul>
                    <p className="mt-2">If the user completes the estimator (Step 11), the status changes to "new" — not partial.</p>
                  </div>
                </div>

                {/* Trigger Conditions */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Current Trigger Conditions</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground block">Min Step</span>
                      <span className="font-medium">Step 8</span>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground block">Required Contact</span>
                      <span className="font-medium">Email OR Phone</span>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground block">Max Step</span>
                      <span className="font-medium">&lt; Step 11</span>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground block">Debounce</span>
                      <span className="font-medium">5 seconds</span>
                    </div>
                  </div>
                </div>

                {/* Testing Tools */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-purple-500" />
                    Testing Tools
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateTestCart}
                      disabled={isCreatingTest}
                    >
                      {isCreatingTest ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FlaskConical className="h-4 w-4 mr-2" />
                      )}
                      Create Test Abandoned Cart
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearTestData}
                      disabled={isClearingTest}
                      className="text-destructive hover:text-destructive"
                    >
                      {isClearingTest ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Clear Test Data (@test emails)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href="/estimator/ducted" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Estimator in New Tab
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Manual Testing Instructions */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">How to Test Manually</h4>
                  <ol className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1 list-decimal list-inside">
                    <li>Click "Open Estimator in New Tab" above</li>
                    <li>Complete Steps 0-8 (enter your contact info at Step 8)</li>
                    <li>Close the tab, switch tabs, or navigate away</li>
                    <li>Return here and refresh to see the partial submission</li>
                  </ol>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || dateFilter !== "all") && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Showing {filteredCarts.length} of {abandonedCarts?.length || 0} abandoned carts
        </p>

        {/* Empty State */}
        {filteredCarts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No abandoned carts</h3>
            <p className="text-muted-foreground">
              {searchQuery || dateFilter !== "all"
                ? "No abandoned carts match your filters"
                : "Great news! No customers have abandoned the estimator yet."}
            </p>
          </div>
        ) : (
          /* Data Table */
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">Details</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCarts.map((cart) => (
                  <TableRow
                    key={`${cart.estimator_type}-${cart.id}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCart(cart)}
                  >
                    <TableCell className="font-medium">
                      {format(new Date(cart.created_at), "MMM d, yyyy")}
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(cart.created_at), "h:mm a")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cart.estimator_type === 'ductless' ? 'secondary' : 'outline'}>
                        {cart.estimator_type === 'ductless' ? 'Ductless' : 'Ducted'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{cart.customer_name || "Not provided"}</div>
                      <div className="text-sm text-muted-foreground md:hidden">
                        {cart.customer_email}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">{cart.customer_email}</div>
                      {cart.customer_phone && (
                        <div className="text-sm text-muted-foreground">{cart.customer_phone}</div>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {cart.estimator_type === 'ductless' ? (
                        <>
                          <div className="text-sm">
                            {cart.zone_count || 0} zone{(cart.zone_count || 0) !== 1 ? 's' : ''}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Mini-split system
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm">
                            {cart.home_type} • {cart.square_footage} sq ft
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {cart.heating_type} heating
                          </div>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="whitespace-nowrap">
                        {formatDistanceToNow(new Date(cart.created_at), { addSuffix: true })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCart(cart);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Detail Sheet */}
        <Sheet open={!!selectedCart} onOpenChange={() => setSelectedCart(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedCart && (
              <>
                <SheetHeader>
                  <SheetTitle>Abandoned Cart Details</SheetTitle>
                  <SheetDescription>
                    Abandoned {formatDistanceToNow(new Date(selectedCart.created_at), { addSuffix: true })}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Estimator Type Badge */}
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedCart.estimator_type === 'ductless' ? 'secondary' : 'outline'}>
                      {selectedCart.estimator_type === 'ductless' ? 'Ductless Estimator' : 'Ducted Estimator'}
                    </Badge>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </h4>
                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCart.customer_name || "Not provided"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${selectedCart.customer_email}`} className="text-primary hover:underline">
                          {selectedCart.customer_email || "Not provided"}
                        </a>
                      </div>
                      {selectedCart.customer_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${selectedCart.customer_phone}`} className="text-primary hover:underline">
                            {selectedCart.customer_phone}
                          </a>
                        </div>
                      )}
                      {selectedCart.customer_address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedCart.customer_address}</span>
                        </div>
                      )}
                      {selectedCart.best_time_to_call && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Best time to call: {selectedCart.best_time_to_call}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Configuration Details - differs by estimator type */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      {selectedCart.estimator_type === 'ductless' ? 'System Configuration' : 'Home Configuration'}
                    </h4>
                    {selectedCart.estimator_type === 'ductless' ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Zones</span>
                          <p className="font-medium">{selectedCart.zone_count || 0} zone{(selectedCart.zone_count || 0) !== 1 ? 's' : ''}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">System Type</span>
                          <p className="font-medium">Mini-Split</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Home Type</span>
                          <p className="font-medium capitalize">{selectedCart.home_type || "Not provided"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Layout</span>
                          <p className="font-medium capitalize">{selectedCart.home_layout || "Not provided"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Square Footage</span>
                          <p className="font-medium">{selectedCart.square_footage || "Not provided"} sq ft</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Heating Type</span>
                          <p className="font-medium capitalize">{selectedCart.heating_type || "Not provided"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Coverage</span>
                          <p className="font-medium capitalize">{selectedCart.coverage || "Not provided"}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold">Quick Actions</h4>
                    <div className="grid gap-2">
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={() => handleMarkContacted(selectedCart)}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Contacted
                      </Button>
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={() => handleConvertToLead(selectedCart)}
                        disabled={updateStatus.isPending}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Convert to Lead
                      </Button>
                      <Button
                        className="w-full justify-start text-destructive hover:text-destructive"
                        variant="outline"
                        onClick={() => handleMarkJunk(selectedCart)}
                        disabled={updateStatus.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Mark as Junk
                      </Button>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-muted-foreground pt-4 border-t">
                    <p>Created: {format(new Date(selectedCart.created_at), "PPpp")}</p>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
};

export default AbandonedCarts;
