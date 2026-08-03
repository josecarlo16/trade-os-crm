import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';
import { CustomerTable } from '@/components/admin/customers/CustomerTable';
import { CustomerFormDialog } from '@/components/admin/customers/CustomerFormDialog';
import { CustomerImportDialog } from '@/components/admin/customers/CustomerImportDialog';
import { DeleteCustomerDialog } from '@/components/admin/customers/DeleteCustomerDialog';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['crm_customers']['Row'];

const Customers = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDeleteOpen(true);
  };

  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setFormOpen(true);
  };

  return (
    <AdminLayout title="Customers">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground">
              Manage your customer database and lead information
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button onClick={handleNewCustomer}>
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Button>
          </div>
        </div>

        <CustomerTable onEdit={handleEdit} onDelete={handleDelete} />

        <CustomerFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          customer={selectedCustomer}
        />

        <CustomerImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
        />

        <DeleteCustomerDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          customer={selectedCustomer}
        />
      </div>
    </AdminLayout>
  );
};

export default Customers;
