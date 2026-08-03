import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Plus, Search, MoreHorizontal, Eye, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { CompanyFormDialog } from '@/components/admin/companies/CompanyFormDialog';

const Companies = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ['crm_companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_companies')
        .select('*')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Get contact counts per company
  const { data: contactCounts } = useQuery({
    queryKey: ['crm_companies_contact_counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_customers')
        .select('company_id')
        .not('company_id', 'is', null)
        .is('deleted_at', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((c) => {
        if (c.company_id) counts[c.company_id] = (counts[c.company_id] || 0) + 1;
      });
      return counts;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_companies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_companies'] });
      queryClient.invalidateQueries({ queryKey: ['crm_companies_contact_counts'] });
      toast.success('Company deleted');
      setDeleteTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = companies?.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.name.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.phone?.includes(search);
  });

  return (
    <AdminLayout title="Companies">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => { setEditingCompany(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Company
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No companies found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered?.map((company) => (
                    <TableRow key={company.id} className="cursor-pointer" onClick={() => navigate(`/admin/companies/${company.id}`)}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {company.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" /><span className="truncate max-w-[150px]">{company.email}</span>
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" /><span>{company.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{contactCounts?.[company.id] || 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(company.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/companies/${company.id}`); }}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingCompany(company); setFormOpen(true); }}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(company); }}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
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
        )}

        <div className="text-sm text-muted-foreground">
          Showing {filtered?.length || 0} of {companies?.length || 0} companies
        </div>
      </div>

      <CompanyFormDialog open={formOpen} onOpenChange={setFormOpen} company={editingCompany} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the company. Linked contacts will remain but will no longer be associated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default Companies;
