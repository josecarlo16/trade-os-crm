import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Calculator, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Loader2,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/alert-dialog';

interface CalculatorConfig {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  calculator_type: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const Calculators = () => {
  const [calculators, setCalculators] = useState<CalculatorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const fetchCalculators = async () => {
    try {
      const { data, error } = await supabase
        .from('calculator_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalculators((data || []).map(calc => ({
        ...calc,
        config: calc.config as Record<string, unknown> || {},
      })));
    } catch (error) {
      console.error('Error fetching calculators:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calculators',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalculators();
  }, []);

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('calculator_configs')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;

      setCalculators(prev => 
        prev.map(calc => 
          calc.id === id ? { ...calc, is_active: !currentState } : calc
        )
      );

      toast({
        title: 'Success',
        description: `Calculator ${!currentState ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error toggling calculator:', error);
      toast({
        title: 'Error',
        description: 'Failed to update calculator status',
        variant: 'destructive',
      });
    }
  };

  const deleteCalculator = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calculator_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCalculators(prev => prev.filter(calc => calc.id !== id));

      toast({
        title: 'Success',
        description: 'Calculator deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting calculator:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete calculator',
        variant: 'destructive',
      });
    }
  };

  const filteredCalculators = calculators.filter(calc =>
    calc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    calc.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout title="Calculators">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Calculators">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search calculators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button asChild className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
            <Link to="/admin/calculators/new">
              <Plus className="h-4 w-4 mr-2" />
              New Calculator
            </Link>
          </Button>
        </div>

        {/* Calculator Cards */}
        {filteredCalculators.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No calculators found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery 
                  ? 'No calculators match your search criteria'
                  : 'Create your first estimate calculator to get started'
                }
              </p>
              {!searchQuery && (
                <Button asChild>
                  <Link to="/admin/calculators/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Calculator
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCalculators.map((calc) => (
              <Card key={calc.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#1e3a5f]/10">
                        <Calculator className="h-5 w-5 text-[#1e3a5f]" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{calc.name}</CardTitle>
                        <CardDescription className="text-xs font-mono">
                          /{calc.slug}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={calc.is_active ? 'default' : 'secondary'}>
                      {calc.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {calc.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {calc.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Active</span>
                      <Switch
                        checked={calc.is_active}
                        onCheckedChange={() => toggleActive(calc.id, calc.is_active)}
                      />
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/calculators/${calc.id}`}>
                          <Settings className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Calculator</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{calc.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCalculator(calc.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Calculators;
