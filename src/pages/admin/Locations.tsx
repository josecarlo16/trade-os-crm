import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  MapPin, 
  Edit, 
  Trash2,
  Home,
  Building2,
  Star,
  Eye,
  ExternalLink
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { AddLocationDialog } from '@/components/admin/locations/AddLocationDialog';
import { LocationDetailsDialog } from '@/components/admin/locations/LocationDetailsDialog';
import type { CrmLocation, CrmCustomer, CrmLocationCustomer } from '@/types/crmLocations';
import { RELATIONSHIP_TYPE_OPTIONS } from '@/types/crmLocations';

type LocationWithCustomer = CrmLocation & {
  customer?: CrmCustomer;
  linked_customers?: CrmLocationCustomer[];
};

export default function Locations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationWithCustomer | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationWithCustomer | null>(null);

  // Fetch locations with customer data and linked customers
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['crm_locations', searchTerm, selectedCustomerId],
    queryFn: async () => {
      let query = supabase
        .from('crm_locations')
        .select(`
          *,
          customer:crm_customers(*),
          linked_customers:crm_location_customers(
            id,
            customer_id,
            relationship_type,
            is_primary_contact,
            created_at,
            customer:crm_customers(id, first_name, last_name, email, phone, company_name)
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.or(`address_line1.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,zip_code.ilike.%${searchTerm}%`);
      }

      if (selectedCustomerId) {
        query = query.eq('customer_id', selectedCustomerId);
      }

      const { data, error } = await query;

      if (error) {
        toast.error('Error fetching locations: ' + error.message);
        throw error;
      }

      return data as LocationWithCustomer[];
    },
  });

  // Fetch customers for filter dropdown and dialog
  const { data: customers = [] } = useQuery({
    queryKey: ['crm_customers_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_customers')
        .select('id, first_name, last_name, email, phone, company_name, billing_address, billing_city, billing_state, billing_zip')
        .is('deleted_at', null)
        .order('last_name');

      if (error) throw error;
      return data as CrmCustomer[];
    },
  });

  // Delete location mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase
        .from('crm_locations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', locationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_locations'] });
      toast.success('Location deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleViewLocation = (location: LocationWithCustomer) => {
    setSelectedLocation(location);
    setIsDetailsDialogOpen(true);
  };

  const handleEditLocation = (location: LocationWithCustomer) => {
    setEditingLocation(location);
    setIsAddDialogOpen(true);
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      deleteMutation.mutate(locationId);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditingLocation(null);
    }
  };

  const getCustomerDisplayName = (customer: CrmCustomer | undefined) => {
    if (!customer) return 'Unknown';
    if (customer.company_name) return customer.company_name;
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed';
  };

  // Stats
  const stats = useMemo(() => ({
    total: locations.length,
    residential: locations.filter(l => l.location_type === 'residential').length,
    commercial: locations.filter(l => l.location_type === 'commercial').length,
    primary: locations.filter(l => l.is_primary).length,
  }), [locations]);

  return (
    <AdminLayout title="Customer Locations">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customer Locations</h1>
            <p className="text-muted-foreground">
              Manage service addresses and property details
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by address, city, or ZIP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(e.target.value || null)}
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {getCustomerDisplayName(customer)}
                  </option>
                ))}
              </select>

              {(searchTerm || selectedCustomerId) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCustomerId(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Residential</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.residential}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commercial</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.commercial}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Primary Locations</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.primary}</div>
            </CardContent>
          </Card>
        </div>

        {/* Locations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Service Locations</CardTitle>
            <CardDescription>
              {locations.length} location{locations.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No locations found. Add your first service location to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Location Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Property Details</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <button
                              onClick={() => navigate(`/admin/customers/${location.customer_id}`)}
                              className="font-medium text-primary hover:underline flex items-center gap-1"
                            >
                              {getCustomerDisplayName(location.customer)}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                            {location.linked_customers && location.linked_customers
                              .filter(lc => lc.customer_id !== location.customer_id)
                              .map(lc => {
                                const relLabel = RELATIONSHIP_TYPE_OPTIONS.find(r => r.value === lc.relationship_type)?.label || lc.relationship_type;
                                const name = lc.customer?.company_name || `${lc.customer?.first_name || ''} ${lc.customer?.last_name || ''}`.trim() || 'Unknown';
                                return (
                                  <div key={lc.id} className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">{relLabel}</Badge>
                                    <button
                                      onClick={() => navigate(`/admin/customers/${lc.customer_id}`)}
                                      className="hover:underline"
                                    >
                                      {name}
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{location.location_name || '—'}</div>
                          {location.building_type && (
                            <div className="text-sm text-muted-foreground capitalize">
                              {location.building_type.replace('_', ' ')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div>{location.address_line1}</div>
                            {location.address_line2 && (
                              <div className="text-sm text-muted-foreground">
                                {location.address_line2}
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground">
                              {location.city}, {location.state} {location.zip_code}
                            </div>
                            {location.county && (
                              <div className="text-xs text-muted-foreground">
                                {location.county} County
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={location.location_type === 'residential' ? 'default' : 'secondary'}>
                            {location.location_type || 'Residential'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {location.square_footage && (
                              <div>{location.square_footage.toLocaleString()} sq ft</div>
                            )}
                            {location.year_built && (
                              <div className="text-muted-foreground">Built {location.year_built}</div>
                            )}
                            {location.stories && (
                              <div className="text-muted-foreground">{location.stories} {location.stories === 1 ? 'story' : 'stories'}</div>
                            )}
                            {!location.square_footage && !location.year_built && !location.stories && (
                              <span className="text-muted-foreground">No data</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {location.is_primary && (
                            <Star className="h-4 w-4 text-primary fill-primary" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewLocation(location)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditLocation(location)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteLocation(location.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Location Dialog */}
        <AddLocationDialog
          open={isAddDialogOpen}
          onOpenChange={handleDialogClose}
          customers={customers}
          editingLocation={editingLocation}
        />

        {/* Location Details Dialog */}
        {selectedLocation && (
          <LocationDetailsDialog
            open={isDetailsDialogOpen}
            onOpenChange={setIsDetailsDialogOpen}
            location={selectedLocation}
            customers={customers}
            onEdit={() => {
              setIsDetailsDialogOpen(false);
              handleEditLocation(selectedLocation);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
