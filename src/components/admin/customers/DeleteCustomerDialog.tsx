import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['crm_customers']['Row'];

interface DeleteCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function DeleteCustomerDialog({ open, onOpenChange, customer }: DeleteCustomerDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!customer) return;
      
      // 1. Delete related submission links
      const { error: linksError } = await supabase
        .from('crm_submission_links')
        .delete()
        .eq('customer_id', customer.id);
      if (linksError) {
        console.error('Failed to delete crm_submission_links:', linksError);
        throw linksError;
      }

      // 2. Delete related customer contacts
      const { error: contactsError } = await supabase
        .from('crm_customer_contacts')
        .delete()
        .eq('customer_id', customer.id);
      if (contactsError) {
        console.error('Failed to delete crm_customer_contacts:', contactsError);
        throw contactsError;
      }

      // 3. Soft delete the customer
      const { error } = await supabase
        .from('crm_customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', customer.id);
      if (error) {
        console.error('Failed to delete crm_customers:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_customers'] });
      toast.success('Customer deleted');
      onOpenChange(false);
    },
    onError: (error: any) => {
      const msg = error?.message || 'Failed to delete customer';
      console.error('Delete customer error:', error);
      toast.error(msg);
    },
  });

  const getDisplayName = (customer: Customer) => {
    if (customer.company_name) return customer.company_name;
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{customer ? getDisplayName(customer) : ''}</strong>? 
            This action can be undone from the trash bin.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
