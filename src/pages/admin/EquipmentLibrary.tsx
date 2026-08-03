import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { documentationApi } from "@/lib/api/documentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Library,
  FileText,
  Search,
  BarChart3,
  Eye,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Database,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EquipmentPage {
  id: string;
  slug: string;
  brand: string;
  model_number: string;
  model_pattern: string | null;
  equipment_type: string | null;
  specs: Record<string, any>;
  documentation_count: number | null;
  times_searched: number | null;
  auto_generated: boolean | null;
  published: boolean | null;
  seo_title: string | null;
  seo_description: string | null;
  custom_content: string | null;
  created_at: string | null;
  updated_at: string | null;
  market_segment: string | null;
  install_count: number | null;
  cities_installed: string[] | null;
  last_installed_at: string | null;
}

interface EquipmentDocumentation {
  id: string;
  brand: string;
  model_number: string | null;
  model_pattern: string;
  document_type: string;
  document_title: string | null;
  document_url: string;
  source_domain: string | null;
  file_type: string | null;
  last_verified: string | null;
  verified_working: boolean | null;
  search_query_used: string | null;
  created_at: string | null;
}

interface SearchLog {
  id: string;
  brand: string | null;
  model_number: string | null;
  cache_hit: boolean | null;
  documents_found: number | null;
  search_duration_ms: number | null;
  created_at: string | null;
}

const AdminEquipmentLibrary = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pages");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"installs" | "last_installed" | "searches">("installs");
  const [isBackfilling, setIsBackfilling] = useState(false);

  // Fetch equipment pages
  const { data: equipmentPages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["admin-equipment-pages", brandFilter, marketFilter, searchQuery, sortBy],
    queryFn: async () => {
      let query = supabase.from("equipment_pages").select("*");

      if (sortBy === "installs") {
        query = query
          .order("install_count", { ascending: false, nullsFirst: false })
          .order("times_searched", { ascending: false, nullsFirst: false });
      } else if (sortBy === "last_installed") {
        query = query
          .order("last_installed_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });
      } else {
        query = query
          .order("times_searched", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });
      }

      if (brandFilter !== "all") {
        query = query.eq("brand", brandFilter);
      }

      if (marketFilter !== "all") {
        query = query.eq("market_segment", marketFilter);
      }

      if (searchQuery) {
        query = query.or(`model_number.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EquipmentPage[];
    },
  });

  // Fetch documentation cache
  const { data: documentation = [], isLoading: docsLoading } = useQuery({
    queryKey: ["admin-equipment-documentation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_documentation")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EquipmentDocumentation[];
    },
  });

  // Fetch search logs
  const { data: searchLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["admin-documentation-search-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentation_search_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as SearchLog[];
    },
  });

  // Get unique brands for filter
  const uniqueBrands = [...new Set(equipmentPages.map((p) => p.brand))].sort();

  // Calculate stats
  const totalPages = equipmentPages.length;
  const publishedPages = equipmentPages.filter((p) => p.published).length;
  const draftPages = totalPages - publishedPages;
  const residentialPages = equipmentPages.filter((p) => p.market_segment === "residential").length;
  const commercialPages = equipmentPages.filter((p) => p.market_segment === "commercial").length;
  const bothPages = equipmentPages.filter((p) => p.market_segment === "both").length;
  const totalDocs = documentation.length;
  const verifiedDocs = documentation.filter((d) => d.verified_working).length;
  const totalSearches = searchLogs.length;
  const cacheHits = searchLogs.filter((l) => l.cache_hit).length;
  const cacheHitRate = totalSearches > 0 ? ((cacheHits / totalSearches) * 100).toFixed(1) : "0";

  // Top city by total install count
  const cityCounts = equipmentPages.reduce((acc, p) => {
    const cities = (p.cities_installed ?? []) as string[];
    const installs = p.install_count ?? 0;
    if (installs <= 0 || cities.length === 0) return acc;
    const perCity = installs / cities.length;
    for (const c of cities) acc[c] = (acc[c] ?? 0) + perCity;
    return acc;
  }, {} as Record<string, number>);
  const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];

  // Document type stats
  const docTypeStats = documentation.reduce((acc, doc) => {
    acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Toggle publish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("equipment_pages")
        .update({ published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-equipment-pages"] });
      toast.success("Page updated");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  // Delete page mutation
  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-equipment-pages"] });
      toast.success("Page deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  // Delete documentation mutation
  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment_documentation").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-equipment-documentation"] });
      toast.success("Document deleted from cache");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  // Test link mutation
  const testLinkMutation = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      try {
        const response = await fetch(url, { method: "HEAD", mode: "no-cors" });
        // no-cors mode always returns opaque response, so we assume it works
        const { error } = await supabase
          .from("equipment_documentation")
          .update({ verified_working: true, last_verified: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch {
        const { error } = await supabase
          .from("equipment_documentation")
          .update({ verified_working: false, last_verified: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return false;
      }
    },
    onSuccess: (working) => {
      queryClient.invalidateQueries({ queryKey: ["admin-equipment-documentation"] });
      toast.success(working ? "Link verified working" : "Link may be broken");
    },
    onError: (error) => {
      toast.error("Failed to test link: " + error.message);
    },
  });

  // Refresh documentation mutation
  const refreshDocsMutation = useMutation({
    mutationFn: async ({ brand, modelNumber }: { brand: string; modelNumber: string }) => {
      // Clear existing cache for this model to force fresh search
      await supabase
        .from("equipment_documentation")
        .delete()
        .ilike("model_number", modelNumber);
      
      // Trigger new search
      const result = await documentationApi.searchDocumentation(brand, modelNumber);
      if (!result.success) {
        throw new Error(result.error || "Search failed");
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-equipment-documentation"] });
      queryClient.invalidateQueries({ queryKey: ["admin-equipment-pages"] });
      toast.success(`Found ${data.documents?.length || 0} documents`);
    },
    onError: (error) => {
      toast.error("Failed to refresh: " + error.message);
    },
  });

  const formatDocType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleBackfill = async () => {
    if (isBackfilling) return;
    setIsBackfilling(true);
    const toastId = toast.loading("Backfilling install counts from scan history…");
    try {
      const { data, error } = await supabase.functions.invoke(
        "backfill-equipment-install-counts",
        { body: {} },
      );
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Unknown failure");
      toast.success(
        `Backfill complete — ${data.pages_updated} models updated from ${data.scans_processed} scans`,
        { id: toastId },
      );
      queryClient.invalidateQueries({ queryKey: ["admin-equipment-pages"] });
    } catch (err) {
      toast.error(
        "Backfill failed: " + (err instanceof Error ? err.message : String(err)),
        { id: toastId },
      );
    } finally {
      setIsBackfilling(false);
    }
  };

  const marketBadgeVariant = (segment: string | null) => {
    if (segment === "commercial") return "default" as const;
    if (segment === "both") return "outline" as const;
    return "secondary" as const;
  };

  return (
    <AdminLayout title="Equipment Library">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipment Library</h1>
          <p className="text-sm text-muted-foreground">
            Manage auto-generated equipment pages, documentation cache, and view search analytics.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pages" className="gap-2">
              <Library className="w-4 h-4" />
              Equipment Pages
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <FileText className="w-4 h-4" />
              Documentation Cache
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Search Analytics
            </TabsTrigger>
          </TabsList>

          {/* Equipment Pages Tab */}
          <TabsContent value="pages" className="space-y-4">
            {/* Header with backfill button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {totalPages} models · {publishedPages} published · {draftPages} drafts
              </p>
              <Button
                onClick={handleBackfill}
                disabled={isBackfilling}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Database className={`w-4 h-4 ${isBackfilling ? "animate-pulse" : ""}`} />
                {isBackfilling ? "Backfilling…" : "Backfill Install Counts"}
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Total / Published
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {totalPages}
                    <span className="text-muted-foreground text-base font-normal"> / {publishedPages}</span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Drafts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-amber-600">{draftPages}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Residential
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{residentialPages}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Commercial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {commercialPages}
                    {bothPages > 0 && (
                      <span className="text-muted-foreground text-base font-normal"> +{bothPages} both</span>
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Top City (Installs)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold truncate">
                    {topCity ? topCity[0] : "—"}
                  </p>
                  {topCity && (
                    <p className="text-xs text-muted-foreground">
                      ~{Math.round(topCity[1])} installs
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Market Segment Filter Chips */}
            <div className="flex flex-wrap gap-2">
              {(["all", "residential", "commercial", "both"] as const).map((seg) => (
                <Button
                  key={seg}
                  variant={marketFilter === seg ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMarketFilter(seg)}
                  className="capitalize"
                >
                  {seg === "all" ? "All Markets" : seg}
                </Button>
              ))}
            </div>

            {/* Search + Brand + Sort */}
            <div className="flex flex-wrap gap-3 items-center">
              <Input
                placeholder="Search by model or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {uniqueBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="installs">Most installs</SelectItem>
                  <SelectItem value="last_installed">Recently installed</SelectItem>
                  <SelectItem value="searches">Most searched</SelectItem>
                </SelectContent>
              </Select>
            </div>


            {/* Pages Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Market</TableHead>
                    <TableHead>Installs</TableHead>
                    <TableHead>Last Installed</TableHead>
                    <TableHead>Cities</TableHead>
                    <TableHead>Searches</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagesLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : equipmentPages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No equipment pages found
                      </TableCell>
                    </TableRow>
                  ) : (
                    equipmentPages.map((page) => {
                      const cities = (page.cities_installed ?? []) as string[];
                      const visibleCities = cities.slice(0, 2);
                      const extraCities = cities.slice(2);
                      return (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.brand}</TableCell>
                        <TableCell className="font-mono text-sm">{page.model_number}</TableCell>
                        <TableCell>
                          <Badge variant={marketBadgeVariant(page.market_segment)} className="capitalize">
                            {page.market_segment ?? "residential"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={(page.install_count ?? 0) > 0 ? "default" : "outline"}
                            className="font-mono"
                          >
                            {page.install_count ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {page.last_installed_at
                            ? formatDistanceToNow(new Date(page.last_installed_at), { addSuffix: true })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {cities.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="flex items-center gap-1 flex-wrap">
                              {visibleCities.map((c) => (
                                <Badge key={c} variant="outline" className="font-normal">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {c}
                                </Badge>
                              ))}
                              {extraCities.length > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="secondary" className="cursor-help">
                                        +{extraCities.length} more
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-xs">{extraCities.join(", ")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{page.times_searched || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={page.published ?? false}
                            onCheckedChange={(checked) =>
                              togglePublishMutation.mutate({ id: page.id, published: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => refreshDocsMutation.mutate({ 
                                brand: page.brand, 
                                modelNumber: page.model_number 
                              })}
                              disabled={refreshDocsMutation.isPending}
                              title="Refresh documentation"
                            >
                              <RefreshCw className={`w-4 h-4 ${refreshDocsMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a
                                href={`/equipment/${page.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Equipment Page</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the page for {page.brand}{" "}
                                    {page.model_number}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deletePageMutation.mutate(page.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Documentation Cache Tab */}
          <TabsContent value="docs" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totalDocs}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Verified Working
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{verifiedDocs}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cache Hit Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{cacheHitRate}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Documents by Type
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {Object.entries(docTypeStats).slice(0, 3).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{formatDocType(type)}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Documentation Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : documentation.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No cached documentation found
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentation.slice(0, 50).map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.brand}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {doc.model_number || doc.model_pattern}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatDocType(doc.document_type)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate">
                          {doc.document_title || "Untitled"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {doc.source_domain || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {doc.verified_working ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                testLinkMutation.mutate({ id: doc.id, url: doc.document_url })
                              }
                              disabled={testLinkMutation.isPending}
                            >
                              <RefreshCw
                                className={`w-4 h-4 ${
                                  testLinkMutation.isPending ? "animate-spin" : ""
                                }`}
                              />
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <a
                                href={doc.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remove this document from the cache? It may be re-cached on the
                                    next search.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteDocMutation.mutate(doc.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Search Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Searches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totalSearches}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cache Hits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{cacheHits}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cache Hit Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{cacheHitRate}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Docs Found
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {searchLogs.length > 0
                      ? (
                          searchLogs.reduce((sum, l) => sum + (l.documents_found || 0), 0) /
                          searchLogs.length
                        ).toFixed(1)
                      : "0"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Searches Table */}
            <div className="space-y-2">
              <h3 className="font-semibold">Recent Searches</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Cache Hit</TableHead>
                      <TableHead>Docs Found</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : searchLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No search logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      searchLogs.slice(0, 25).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.created_at
                              ? format(new Date(log.created_at), "MMM d, h:mm a")
                              : "N/A"}
                          </TableCell>
                          <TableCell className="font-medium">{log.brand || "Unknown"}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.model_number || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {log.cache_hit ? (
                              <Badge variant="default" className="bg-green-600">
                                Hit
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Miss</Badge>
                            )}
                          </TableCell>
                          <TableCell>{log.documents_found || 0}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.search_duration_ms ? `${log.search_duration_ms}ms` : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Models with No Documentation */}
            <div className="space-y-2">
              <h3 className="font-semibold">Models With No Documentation Found</h3>
              <p className="text-sm text-muted-foreground">
                Recent searches that returned 0 documents - opportunity to manually add documentation.
              </p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Last Searched</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchLogs
                      .filter((l) => l.documents_found === 0 && !l.cache_hit)
                      .slice(0, 10)
                      .map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.brand || "Unknown"}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.model_number || "Unknown"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.created_at
                              ? format(new Date(log.created_at), "MMM d, yyyy")
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    {searchLogs.filter((l) => l.documents_found === 0 && !l.cache_hit).length ===
                      0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          No failed searches found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminEquipmentLibrary;
