import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Eye, 
  Edit,
  Trash2,
  ArrowUpDown,
  Building2
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['crm_customers']['Row'];

interface LeadSource {
  name: string;
  display_name: string;
  color: string;
}

interface CampaignTag {
  name: string;
  color: string;
}

interface CustomerTableProps {
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  prospect: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  archived: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function CustomerTable({ onEdit, onDelete }: CustomerTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'created_at' | 'last_name'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('crm_customers')
        .update({ customer_status: status as Customer['customer_status'] })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_customers'] });
      toast.success('Status updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update status'),
  });

  // Fetch lead sources for display names
  const { data: leadSources } = useQuery({
    queryKey: ['lead_sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_sources')
        .select('name, display_name, color');
      if (error) throw error;
      return data as LeadSource[];
    },
  });

  // Fetch campaign tags for colors
  const { data: campaignTags } = useQuery({
    queryKey: ['crm_campaign_tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_campaign_tags')
        .select('name, color');
      if (error) throw error;
      return data as CampaignTag[];
    },
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['crm_customers', statusFilter, typeFilter, sortField, sortDirection],
    queryFn: async () => {
      let query = supabase
        .from('crm_customers')
        .select('*, crm_companies!company_id(id, name)')
        .is('deleted_at', null)
        .order(sortField, { ascending: sortDirection === 'asc' });

      if (statusFilter !== 'all') {
        query = query.eq('customer_status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('customer_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });

  const getSourceDisplay = (sourceName: string | null) => {
    if (!sourceName) return null;
    const source = leadSources?.find((s) => s.name === sourceName);
    return source || { display_name: sourceName, color: '#6b7280' };
  };

  const getTagColor = (tagName: string) => {
    const tag = campaignTags?.find((t) => t.name === tagName);
    return tag?.color || '#3b82f6';
  };


  const filteredCustomers = customers?.filter((customer) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const fullName = `${(customer.first_name || '').trim()} ${(customer.last_name || '').trim()}`.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(search) ||
      customer.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const toggleSort = (field: 'created_at' | 'last_name') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getDisplayName = (customer: any) => {
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => toggleSort('last_name')}
                >
                  Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => toggleSort('created_at')}
                >
                  Created
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers?.length === 0 ? (
              <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers?.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className="cursor-pointer"
                  onClick={() => navigate(`/admin/customers/${customer.id}`)}
                >
                  <TableCell className="font-medium">
                    {getDisplayName(customer)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {customer.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={customer.customer_status}
                      onValueChange={(v) => updateStatusMutation.mutate({ id: customer.id, status: v })}
                    >
                      <SelectTrigger
                        className={`h-7 w-[110px] border-0 px-2 text-xs font-medium capitalize focus:ring-0 focus:ring-offset-0 ${statusColors[customer.customer_status] || ''}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                    <TableCell className="capitalize">{customer.customer_type}</TableCell>
                    <TableCell>
                      {customer.lead_source && (() => {
                        const source = getSourceDisplay(customer.lead_source);
                        if (!source) return '—';
                        return (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: source.color }}
                            />
                            <span className="text-sm text-muted-foreground truncate">
                              {source.display_name}
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(customer as any).company_id && (customer as any).crm_companies ? (
                        <Link
                          to={`/admin/companies/${(customer as any).company_id}`}
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Building2 className="h-3 w-3" />
                          {(customer as any).crm_companies?.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.tags && customer.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {customer.tags.slice(0, 2).map((tag) => {
                            const tagColor = getTagColor(tag);
                            return (
                              <Badge
                                key={tag}
                                style={{
                                  backgroundColor: tagColor + '20',
                                  color: tagColor,
                                  borderColor: tagColor,
                                }}
                                variant="outline"
                                className="text-xs truncate max-w-[70px]"
                              >
                                {tag}
                              </Badge>
                            );
                          })}
                          {customer.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{customer.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/customers/${customer.id}`);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onEdit(customer);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(customer);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredCustomers?.length || 0} of {customers?.length || 0} customers
      </div>
    </div>
  );
}
