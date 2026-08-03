import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  UserPlus, 
  Search,
  Shield,
  Trash2,
  Users,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
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

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  email?: string;
}

const UsersPage = () => {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('manager');
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  
  // Password management state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRole | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Create user state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPassword, setCreateConfirmPassword] = useState('');
  const [createRole, setCreateRole] = useState<AppRole>('manager');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      // Use the RPC function to get users with emails
      const { data, error } = await supabase
        .rpc('get_user_roles_with_email');

      if (error) throw error;
      setUsers((data || []) as UserRole[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addUser = async () => {
    if (!newUserEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a user ID',
        variant: 'destructive',
      });
      return;
    }

    setAdding(true);

    try {
      // The email field is actually the user_id (UUID)
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: newUserEmail,
          role: newUserRole,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User role added successfully',
      });

      setNewUserEmail('');
      setNewUserRole('manager');
      setIsAddDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user role',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const updateRole = async (id: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', id);

      if (error) throw error;

      setUsers(prev => 
        prev.map(u => u.id === id ? { ...u, role: newRole } : u)
      );

      toast({
        title: 'Success',
        description: 'Role updated successfully',
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== id));

      toast({
        title: 'Success',
        description: 'User role removed',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user role',
        variant: 'destructive',
      });
    }
  };

  const openPasswordDialog = (user: UserRole) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setIsPasswordDialogOpen(true);
  };

  const resetPassword = async () => {
    if (!selectedUser) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setResettingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-password-reset', {
        body: {
          action: 'reset_password',
          targetUserId: selectedUser.user_id,
          newPassword: newPassword,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Success',
        description: `Password updated for ${selectedUser.email || 'user'}`,
      });

      setIsPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const createUser = async () => {
    if (!createEmail || !createPassword) {
      toast({
        title: 'Error',
        description: 'Please enter email and password',
        variant: 'destructive',
      });
      return;
    }

    if (createPassword !== createConfirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (createPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-password-reset', {
        body: {
          action: 'create_user',
          email: createEmail,
          password: createPassword,
          role: createRole,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Success',
        description: `User ${createEmail} created successfully`,
      });

      setCreateEmail('');
      setCreatePassword('');
      setCreateConfirmPassword('');
      setCreateRole('manager');
      setIsCreateDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    u.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'technician':
      case 'lead_tech':
      case 'installer':
      case 'helper':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: AppRole) => {
    const names: Record<AppRole, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      manager: 'Manager',
      technician: 'Technician',
      lead_tech: 'Lead Tech',
      installer: 'Installer',
      helper: 'Helper',
    };
    return names[role] || role;
  };

  if (!isAdmin) {
    return (
      <AdminLayout title="Users">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground text-center">
              Only administrators can manage user roles.
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout title="Users">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Users & Roles">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Create a new user with email, password, and role assignment.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="createEmail">Email</Label>
                    <Input
                      id="createEmail"
                      type="email"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="createPassword">Password</Label>
                    <div className="relative">
                      <Input
                        id="createPassword"
                        type={showCreatePassword ? 'text' : 'password'}
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        placeholder="Enter password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                      >
                        {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="createConfirmPassword">Confirm Password</Label>
                    <Input
                      id="createConfirmPassword"
                      type={showCreatePassword ? 'text' : 'password'}
                      value={createConfirmPassword}
                      onChange={(e) => setCreateConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                    />
                  </div>
                  {createPassword && createConfirmPassword && createPassword !== createConfirmPassword && (
                    <p className="text-sm text-destructive">Passwords do not match</p>
                  )}
                  {createPassword && createPassword.length < 6 && (
                    <p className="text-sm text-destructive">Password must be at least 6 characters</p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="createRole">Role</Label>
                    <Select value={createRole} onValueChange={(v) => setCreateRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin (System Config)</SelectItem>
                        <SelectItem value="admin">Admin (Full Access)</SelectItem>
                        <SelectItem value="manager">Manager (Limited Access)</SelectItem>
                        <SelectItem value="technician">Technician (Field Tech)</SelectItem>
                        <SelectItem value="lead_tech">Lead Tech (Senior Field)</SelectItem>
                        <SelectItem value="installer">Installer (Installation Crew)</SelectItem>
                        <SelectItem value="helper">Helper (Apprentice)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={createUser} 
                    disabled={creating || !createEmail || createPassword !== createConfirmPassword || createPassword.length < 6}
                  >
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Add Role to Existing User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add User Role</DialogTitle>
                  <DialogDescription>
                    Enter the user's UUID from the authentication system to assign a role.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID (UUID)</Label>
                    <Input
                      id="userId"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can find the user ID in Settings after they log in.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin (Full Access)</SelectItem>
                        <SelectItem value="manager">Manager (Limited Access)</SelectItem>
                        <SelectItem value="technician">Technician (Field Tech)</SelectItem>
                        <SelectItem value="lead_tech">Lead Tech (Senior Field)</SelectItem>
                        <SelectItem value="installer">Installer (Installation Crew)</SelectItem>
                        <SelectItem value="helper">Helper (Apprentice)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addUser} disabled={adding}>
                    {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Role Legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Badge variant="destructive">Super Admin</Badge>
                <p className="text-sm text-muted-foreground">
                  System configuration and full access to all features
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge>Admin</Badge>
                <p className="text-sm text-muted-foreground">
                  Full access: manage users, blog, SEO, calculators, and all submissions
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary">Manager</Badge>
                <p className="text-sm text-muted-foreground">
                  Limited access: view dashboard, manage submissions and blog posts
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">Technician</Badge>
                <p className="text-sm text-muted-foreground">
                  Field technician access for service and repair tasks
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">Lead Tech</Badge>
                <p className="text-sm text-muted-foreground">
                  Senior field technician with team oversight
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">Installer</Badge>
                <p className="text-sm text-muted-foreground">
                  Installation crew member for equipment setup
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">Helper</Badge>
                <p className="text-sm text-muted-foreground">
                  Apprentice or assistant role with limited access
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery 
                  ? 'No users match your search'
                  : 'Add your first admin or manager user'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.email || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{user.user_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={user.role} 
                        onValueChange={(v) => updateRole(user.id, v as AppRole)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="lead_tech">Lead Tech</SelectItem>
                          <SelectItem value="installer">Installer</SelectItem>
                          <SelectItem value="helper">Helper</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openPasswordDialog(user)}
                          title="Reset Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove User Role</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove admin/manager access for this user. They will no longer be able to access the admin panel.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUser(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Password Reset Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset User Password</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedUser?.email || 'this user'}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
              {newPassword && newPassword.length < 6 && (
                <p className="text-sm text-destructive">Password must be at least 6 characters</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={resetPassword} 
                disabled={resettingPassword || newPassword !== confirmPassword || newPassword.length < 6}
              >
                {resettingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default UsersPage;
