import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { navSections } from '@/components/admin/adminNavConfig';
import { Loader2, Shield, CheckSquare, Square } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';

interface Permission {
  id: string;
  role: string;
  permission_key: string;
  enabled: boolean;
}

type AppRole = 'admin' | 'manager' | 'technician' | 'lead_tech' | 'installer' | 'helper';

const ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  technician: 'Technician',
  lead_tech: 'Lead Tech',
  installer: 'Installer',
  helper: 'Helper',
};

const RolePermissions = () => {
  const [permissions, setPermissions] = useState<Record<AppRole, Record<string, boolean>>>({
    admin: {},
    manager: {},
    technician: {},
    lead_tech: {},
    installer: {},
    helper: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');

      if (error) throw error;

      const permMap: Record<AppRole, Record<string, boolean>> = {
        admin: {},
        manager: {},
        technician: {},
        lead_tech: {},
        installer: {},
        helper: {},
      };

      data?.forEach((p: Permission) => {
        const validRoles: AppRole[] = ['admin', 'manager', 'technician', 'lead_tech', 'installer', 'helper'];
        if (validRoles.includes(p.role as AppRole)) {
          permMap[p.role as AppRole][p.permission_key] = p.enabled;
        }
      });

      setPermissions(permMap);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const togglePermission = async (role: AppRole, permissionKey: string) => {
    const currentValue = permissions[role][permissionKey] ?? false;
    const newValue = !currentValue;

    // Optimistic update
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permissionKey]: newValue,
      },
    }));

    setSaving(permissionKey);

    try {
      const { error } = await supabase
        .from('role_permissions')
        .upsert({
          role,
          permission_key: permissionKey,
          enabled: newValue,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'role,permission_key',
        });

      if (error) throw error;

      toast({
        title: 'Permission updated',
        description: `${permissionKey} is now ${newValue ? 'enabled' : 'disabled'} for ${ROLE_DISPLAY_NAMES[role]}. Affected users must refresh their browser to see changes.`,
      });
    } catch (error) {
      // Revert on error
      setPermissions(prev => ({
        ...prev,
        [role]: {
          ...prev[role],
          [permissionKey]: currentValue,
        },
      }));
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const toggleAllInSection = async (role: AppRole, sectionItems: { permissionKey: string }[], enable: boolean) => {
    setSaving('bulk');

    try {
      const updates = sectionItems.map(item => ({
        role,
        permission_key: item.permissionKey,
        enabled: enable,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('role_permissions')
        .upsert(updates, {
          onConflict: 'role,permission_key',
        });

      if (error) throw error;

      // Update local state
      setPermissions(prev => {
        const newRolePerms = { ...prev[role] };
        sectionItems.forEach(item => {
          newRolePerms[item.permissionKey] = enable;
        });
        return { ...prev, [role]: newRolePerms };
      });

      toast({
        title: 'Permissions updated',
        description: `All items ${enable ? 'enabled' : 'disabled'} for ${role}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update permissions',
        variant: 'destructive',
      });
      fetchPermissions(); // Refetch to reset state
    } finally {
      setSaving(null);
    }
  };

  // Show loading while checking permissions
  if (loading || roleLoading) {
    return (
      <AdminLayout title="Role Permissions">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  // Only super_admin can access this page - check after loading is complete
  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const renderRoleTab = (role: AppRole) => (
    <div className="space-y-6">
      {navSections.map(section => (
        <Card key={section.title}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{section.title}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllInSection(role, section.items, true)}
                  disabled={saving !== null}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllInSection(role, section.items, false)}
                  disabled={saving !== null}
                >
                  <Square className="h-4 w-4 mr-1" />
                  None
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map(item => {
                const isEnabled = permissions[role][item.permissionKey] ?? false;
                const isSaving = saving === item.permissionKey || saving === 'bulk';

                return (
                  <div
                    key={item.permissionKey}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`${role}-${item.permissionKey}`}
                      checked={isEnabled}
                      onCheckedChange={() => togglePermission(role, item.permissionKey)}
                      disabled={isSaving}
                    />
                    <Label
                      htmlFor={`${role}-${item.permissionKey}`}
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </Label>
                    {isSaving && saving === item.permissionKey && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <AdminLayout title="Role Permissions">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Role Permissions</h1>
            <p className="text-muted-foreground">
              Configure which navigation items each role can access
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Permission Matrix</CardTitle>
            <CardDescription>
              Check/uncheck items to show or hide them for each role. Super admins always have full access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                {(Object.keys(ROLE_DISPLAY_NAMES) as AppRole[]).map((role) => (
                  <TabsTrigger key={role} value={role}>
                    {ROLE_DISPLAY_NAMES[role]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {(Object.keys(ROLE_DISPLAY_NAMES) as AppRole[]).map((role) => (
                <TabsContent key={role} value={role}>
                  {renderRoleTab(role)}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default RolePermissions;
