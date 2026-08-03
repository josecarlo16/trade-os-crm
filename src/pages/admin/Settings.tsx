import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Crown, Trash2, ArrowRight, FileText } from 'lucide-react';
import { SystemDocumentation } from '@/components/admin/settings/SystemDocumentation';

const Settings = () => {
  const { user } = useAuth();
  const { role, isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [claiming, setClaiming] = useState(false);

  const claimAdminRole = async () => {
    if (!user) return;
    
    setClaiming(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin',
        });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast({
            title: 'Already assigned',
            description: 'You already have a role assigned.',
            variant: 'destructive',
          });
        } else if (error.message.includes('policy')) {
          toast({
            title: 'Cannot claim admin',
            description: 'An admin already exists. Ask them to grant you access.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Success!',
          description: 'You are now an admin. Please refresh the page.',
        });
        // Refresh to update role
        window.location.reload();
      }
    } catch (error) {
      console.error('Error claiming admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim admin role',
        variant: 'destructive',
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-foreground">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">User ID</p>
              <p className="text-foreground font-mono text-sm">{user?.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Role</p>
              {roleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : role ? (
                <Badge variant={isAdmin ? 'default' : 'secondary'} className="flex items-center gap-1 w-fit">
                  {isAdmin ? <Crown className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No role assigned</p>
                  <Button 
                    onClick={claimAdminRole} 
                    disabled={claiming}
                    size="sm"
                    className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
                  >
                    {claiming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Claim Admin Role
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    First user to claim becomes admin. Otherwise, ask an existing admin.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Permissions</CardTitle>
              <CardDescription>
                As an admin, you have full access to:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Manage user roles and permissions</li>
                <li>SEO settings per page</li>
                <li>Calculator configuration</li>
                <li>All submissions and blog posts</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Trash Bin</CardTitle>
              </div>
              <CardDescription>
                View and restore deleted items. Items are automatically removed after 30 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/admin/trash-bin">
                <Button variant="outline" className="gap-2">
                  View Trash Bin
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle>System Documentation</CardTitle>
              </div>
              <CardDescription>
                Export technical documentation for external AI assistants like Claude
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemDocumentation />
            </CardContent>
          </Card>
        )}

        {role === 'manager' && (
          <Card>
            <CardHeader>
              <CardTitle>Manager Permissions</CardTitle>
              <CardDescription>
                As a manager, you have access to:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>View dashboard and analytics</li>
                <li>Manage contact submissions</li>
                <li>Create and edit blog posts</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default Settings;
