import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { RateHistoryDialog } from '@/components/admin/teams/RateHistoryDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, MoreHorizontal, Pencil, Trash2, Users, UserPlus, Phone, Mail, Award, 
  AlertTriangle, Building, Calendar, Briefcase, Shield, Clock, User
} from 'lucide-react';
import { format, differenceInDays, isPast, isFuture, addDays } from 'date-fns';

interface Team {
  id: string;
  name: string;
  team_type: string;
  description: string | null;
  color: string;
  is_active: boolean;
  google_calendar_id: string | null;
  max_concurrent_jobs: number | null;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  member_type: string;
  certifications: string[];
  specialties: string[];
  hourly_rate: number | null;
  overtime_rate: number | null;
  license_number: string | null;
  license_expiry: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  hire_date: string | null;
  is_active: boolean;
  notes: string | null;
  workedge_user_id: string | null;
}

interface TeamAssignment {
  id: string;
  team_id: string;
  member_id: string;
  is_lead: boolean;
  role_in_team: string;
  member?: TeamMember;
}

interface JobAssignment {
  id: string;
  job_id: string;
  team_id: string | null;
  member_id: string | null;
  role: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_hours: number | null;
  job?: {
    id: string;
    title: string;
    job_number: string;
    current_stage_id: string | null;
  };
}

export default function Teams() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('teams');
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [assigningToTeam, setAssigningToTeam] = useState<Team | null>(null);
  const [memberTypeFilter, setMemberTypeFilter] = useState<string>('all');
  const [rateHistoryMember, setRateHistoryMember] = useState<TeamMember | null>(null);

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['crm_teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_teams')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Team[];
    }
  });

  const { data: members = [] } = useQuery({
    queryKey: ['crm_team_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_team_members')
        .select('*')
        .order('first_name');
      if (error) throw error;
      return data as TeamMember[];
    }
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['crm_team_assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_team_assignments')
        .select('*, member:crm_team_members(*)');
      if (error) throw error;
      return data as TeamAssignment[];
    }
  });

  const { data: jobAssignments = [] } = useQuery({
    queryKey: ['crm_job_assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_assignments')
        .select('*, job:crm_jobs(id, title, job_number, current_stage_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as JobAssignment[];
    }
  });

  // License expiry alerts
  const expiringLicenses = useMemo(() => {
    const today = new Date();
    const warningThreshold = addDays(today, 60);
    return members.filter(m => {
      if (!m.license_expiry) return false;
      const expiry = new Date(m.license_expiry);
      return isPast(expiry) || (isFuture(expiry) && expiry <= warningThreshold);
    }).sort((a, b) => {
      const aDate = new Date(a.license_expiry!);
      const bDate = new Date(b.license_expiry!);
      return aDate.getTime() - bDate.getTime();
    });
  }, [members]);

  // Filter members by type
  const filteredMembers = useMemo(() => {
    if (memberTypeFilter === 'all') return members.filter(m => m.is_active);
    return members.filter(m => m.is_active && m.member_type === memberTypeFilter);
  }, [members, memberTypeFilter]);

  // Separate subcontractors
  const subcontractors = useMemo(() => 
    members.filter(m => m.member_type === 'subcontractor' && m.is_active), 
    [members]
  );

  const internalTeamMembers = useMemo(() => 
    members.filter(m => m.member_type !== 'subcontractor' && m.is_active), 
    [members]
  );

  const deactivatedMembers = useMemo(() => 
    members.filter(m => !m.is_active), 
    [members]
  );

  const saveTeamMutation = useMutation({
    mutationFn: async (teamData: Partial<Team>) => {
      if (editingTeam?.id) {
        const { error } = await supabase
          .from('crm_teams')
          .update(teamData)
          .eq('id', editingTeam.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_teams').insert(teamData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_teams'] });
      setIsTeamDialogOpen(false);
      setEditingTeam(null);
      toast.success(editingTeam ? 'Team updated' : 'Team created');
    },
    onError: (error) => toast.error('Failed to save team: ' + error.message)
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_teams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_teams'] });
      toast.success('Team deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message)
  });

  const saveMemberMutation = useMutation({
    mutationFn: async (memberData: Partial<TeamMember>) => {
      if (editingMember?.id) {
        const { error } = await supabase
          .from('crm_team_members')
          .update(memberData)
          .eq('id', editingMember.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_team_members').insert(memberData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_team_members'] });
      setIsMemberDialogOpen(false);
      setEditingMember(null);
      toast.success(editingMember ? 'Member updated' : 'Member added');
    },
    onError: (error) => toast.error('Failed to save member: ' + error.message)
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_team_members')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_team_members'] });
      toast.success('Member deactivated');
    },
    onError: (error) => toast.error('Failed to deactivate: ' + error.message)
  });

  const reactivateMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_team_members')
        .update({ is_active: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_team_members'] });
      toast.success('Member reactivated');
    },
    onError: (error) => toast.error('Failed to reactivate: ' + error.message)
  });

  const assignMemberMutation = useMutation({
    mutationFn: async ({ teamId, memberId, isLead, roleInTeam }: { 
      teamId: string; memberId: string; isLead: boolean; roleInTeam: string 
    }) => {
      const { error } = await supabase
        .from('crm_team_assignments')
        .insert({ team_id: teamId, member_id: memberId, is_lead: isLead, role_in_team: roleInTeam });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_team_assignments'] });
      setIsAssignDialogOpen(false);
      setAssigningToTeam(null);
      toast.success('Member assigned to team');
    },
    onError: (error) => toast.error('Failed to assign member: ' + error.message)
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from('crm_team_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_team_assignments'] });
      toast.success('Member removed from team');
    }
  });

  const getTeamMembers = (teamId: string) => {
    return assignments.filter(a => a.team_id === teamId);
  };

  const getUnassignedMembers = (teamId: string) => {
    const assignedIds = assignments.filter(a => a.team_id === teamId).map(a => a.member_id);
    return members.filter(m => !assignedIds.includes(m.id) && m.is_active);
  };

  const getJobCountForTeam = (teamId: string) => {
    return jobAssignments.filter(ja => ja.team_id === teamId).length;
  };

  const getJobCountForMember = (memberId: string) => {
    return jobAssignments.filter(ja => ja.member_id === memberId).length;
  };

  const teamTypeColors: Record<string, string> = {
    install: 'bg-green-500/10 text-green-600',
    service: 'bg-blue-500/10 text-blue-600',
    inspection: 'bg-amber-500/10 text-amber-600',
    maintenance: 'bg-purple-500/10 text-purple-600',
    custom: 'bg-gray-500/10 text-gray-600'
  };

  const memberTypeColors: Record<string, string> = {
    technician: 'bg-blue-500/10 text-blue-600',
    installer: 'bg-green-500/10 text-green-600',
    lead_installer: 'bg-emerald-500/10 text-emerald-600',
    apprentice: 'bg-amber-500/10 text-amber-600',
    subcontractor: 'bg-orange-500/10 text-orange-600',
    helper: 'bg-gray-500/10 text-gray-600'
  };

  const getLicenseStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntil = differenceInDays(expiry, today);
    
    if (daysUntil < 0) return { status: 'expired', color: 'bg-red-500/10 text-red-600', text: 'Expired' };
    if (daysUntil <= 30) return { status: 'critical', color: 'bg-red-500/10 text-red-600', text: `${daysUntil}d left` };
    if (daysUntil <= 60) return { status: 'warning', color: 'bg-amber-500/10 text-amber-600', text: `${daysUntil}d left` };
    return { status: 'ok', color: 'bg-green-500/10 text-green-600', text: format(expiry, 'MMM d, yyyy') };
  };

  return (
    <AdminLayout title="Teams & Crew">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teams & Crew</h1>
            <p className="text-muted-foreground">Manage technicians, install teams, and subcontractors</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setEditingMember(null)}>
                  <UserPlus className="h-4 w-4 mr-2" /> Add Team Member
                </Button>
              </DialogTrigger>
              <MemberDialog
                editingMember={editingMember}
                onSave={(data) => saveMemberMutation.mutate(data)}
                isLoading={saveMemberMutation.isPending}
              />
            </Dialog>
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingTeam(null)}>
                  <Plus className="h-4 w-4 mr-2" /> New Team
                </Button>
              </DialogTrigger>
              <TeamDialog
                editingTeam={editingTeam}
                onSave={(data) => saveTeamMutation.mutate(data)}
                isLoading={saveTeamMutation.isPending}
              />
            </Dialog>
          </div>
        </div>

        {/* License Expiry Alerts */}
        {expiringLicenses.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                License Expiry Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {expiringLicenses.map(member => {
                  const status = getLicenseStatus(member.license_expiry);
                  return (
                    <Badge key={member.id} className={`${status?.color} gap-1`}>
                      {member.first_name} {member.last_name} - {status?.text}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="teams" className="gap-2">
              <Users className="h-4 w-4" /> Teams ({teams.length})
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <User className="h-4 w-4" /> Team Members ({internalTeamMembers.length})
            </TabsTrigger>
            <TabsTrigger value="subcontractors" className="gap-2">
              <Building className="h-4 w-4" /> Subcontractors ({subcontractors.length})
            </TabsTrigger>
            <TabsTrigger value="deactivated" className="gap-2">
              <Shield className="h-4 w-4" /> Deactivated ({deactivatedMembers.length})
            </TabsTrigger>
          </TabsList>

          {/* Teams Tab */}
          <TabsContent value="teams" className="mt-6">
            {teamsLoading ? (
              <p className="text-muted-foreground">Loading teams...</p>
            ) : teams.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first team to organize your crew</p>
                  <Button onClick={() => setIsTeamDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Create Team
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(team => {
                  const teamMembers = getTeamMembers(team.id);
                  const jobCount = getJobCountForTeam(team.id);
                  const lead = teamMembers.find(a => a.is_lead)?.member;
                  return (
                    <Card key={team.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: team.color }}
                              />
                              <CardTitle className="text-lg">{team.name}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={teamTypeColors[team.team_type] || ''}>
                                {team.team_type}
                              </Badge>
                              {!team.is_active && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingTeam(team); setIsTeamDialogOpen(true); }}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit Team
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setAssigningToTeam(team); setIsAssignDialogOpen(true); }}>
                                <UserPlus className="h-4 w-4 mr-2" /> Add Member
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteTeamMutation.mutate(team.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {team.description && (
                          <CardDescription>{team.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        {/* Team Stats */}
                        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{teamMembers.length} members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            <span>{jobCount} jobs</span>
                          </div>
                        </div>

                        {/* Team Lead */}
                        {lead && (
                          <div className="mb-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">Lead: {lead.first_name} {lead.last_name}</span>
                            </div>
                          </div>
                        )}

                        {/* Team Members */}
                        <div className="space-y-2">
                          {teamMembers.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No members assigned
                            </p>
                          ) : (
                            teamMembers.filter(a => !a.is_lead).map(assignment => {
                              const member = assignment.member;
                              if (!member) return null;
                              return (
                                <div
                                  key={assignment.id}
                                  className="flex items-center gap-3 p-2 rounded-lg bg-accent/50"
                                >
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                    {member.first_name[0]}{member.last_name?.[0] || ''}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-sm">
                                      {member.first_name} {member.last_name}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
                                      {assignment.role_in_team === 'backup' && (
                                        <Badge variant="secondary" className="text-xs">Backup</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => removeAssignmentMutation.mutate(assignment.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Team Members Tab */}
          <TabsContent value="members" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Label>Filter by type:</Label>
                <Select value={memberTypeFilter} onValueChange={setMemberTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="installer">Installer</SelectItem>
                    <SelectItem value="lead_installer">Lead Installer</SelectItem>
                    <SelectItem value="apprentice">Apprentice</SelectItem>
                    <SelectItem value="helper">Helper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {internalTeamMembers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Team Members Yet</h3>
                  <p className="text-muted-foreground mb-4">Add your first team member</p>
                  <Button onClick={() => { setEditingMember(null); setIsMemberDialogOpen(true); }}>
                    <UserPlus className="h-4 w-4 mr-2" /> Add Team Member
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.filter(m => m.member_type !== 'subcontractor').map(member => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    jobCount={getJobCountForMember(member.id)}
                    memberTypeColors={memberTypeColors}
                    getLicenseStatus={getLicenseStatus}
                    onEdit={() => { setEditingMember(member); setIsMemberDialogOpen(true); }}
                    onDelete={() => deleteMemberMutation.mutate(member.id)}
                    onShowRateHistory={setRateHistoryMember}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Subcontractors Tab */}
          <TabsContent value="subcontractors" className="mt-6">
            {subcontractors.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Subcontractors Yet</h3>
                  <p className="text-muted-foreground mb-4">Add subcontractors for specialized work</p>
                  <Button onClick={() => { setEditingMember(null); setIsMemberDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Subcontractor
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subcontractors.map(member => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    jobCount={getJobCountForMember(member.id)}
                    memberTypeColors={memberTypeColors}
                    getLicenseStatus={getLicenseStatus}
                    onEdit={() => { setEditingMember(member); setIsMemberDialogOpen(true); }}
                    onDelete={() => deleteMemberMutation.mutate(member.id)}
                    onShowRateHistory={setRateHistoryMember}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Deactivated Tab */}
          <TabsContent value="deactivated" className="mt-6">
            {deactivatedMembers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Deactivated Members</h3>
                  <p className="text-muted-foreground">All team members are currently active</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deactivatedMembers.map(member => (
                  <Card key={member.id} className="opacity-75">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{member.first_name} {member.last_name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
                            <Badge className={memberTypeColors[member.member_type] || ''} variant="secondary">
                              {member.member_type?.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2 text-sm text-muted-foreground">
                      {member.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" /> {member.email}
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" /> {member.phone}
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reactivateMemberMutation.mutate(member.id)}
                          disabled={reactivateMemberMutation.isPending}
                        >
                          Reactivate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Assign Member Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Member to {assigningToTeam?.name}</DialogTitle>
            </DialogHeader>
            {assigningToTeam && (
              <AssignMemberForm
                teamId={assigningToTeam.id}
                availableMembers={getUnassignedMembers(assigningToTeam.id)}
                onAssign={(memberId, isLead, roleInTeam) => assignMemberMutation.mutate({ 
                  teamId: assigningToTeam.id, 
                  memberId, 
                  isLead,
                  roleInTeam
                })}
                isLoading={assignMemberMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        <RateHistoryDialog
          open={!!rateHistoryMember}
          onOpenChange={(o) => !o && setRateHistoryMember(null)}
          memberId={rateHistoryMember?.id ?? null}
          memberName={rateHistoryMember ? `${rateHistoryMember.first_name} ${rateHistoryMember.last_name ?? ''}`.trim() : undefined}
        />
      </div>
    </AdminLayout>
  );
}

function MemberCard({ 
  member, 
  jobCount,
  memberTypeColors, 
  getLicenseStatus,
  onEdit, 
  onDelete,
  onShowRateHistory,
}: { 
  member: TeamMember; 
  jobCount: number;
  memberTypeColors: Record<string, string>;
  getLicenseStatus: (date: string | null) => { status: string; color: string; text: string } | null;
  onEdit: () => void;
  onDelete: () => void;
  onShowRateHistory: (member: TeamMember) => void;
}) {
  const licenseStatus = getLicenseStatus(member.license_expiry);

  return (
    <Card className="hover:bg-accent/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
              {member.first_name[0]}{member.last_name?.[0] || ''}
            </div>
            <div>
              <h4 className="font-medium">{member.first_name} {member.last_name}</h4>
              <div className="flex items-center gap-1">
                <Badge className={`text-xs capitalize ${memberTypeColors[member.member_type] || ''}`}>
                  {member.member_type?.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm">
          {member.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" /> {member.phone}
            </div>
          )}
          {member.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3 w-3" /> {member.email}
            </div>
          )}
          
          {/* Job Count */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-3 w-3" /> {jobCount} assigned jobs
          </div>

          {/* Hourly Rate */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onShowRateHistory(member); }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:underline text-left"
          >
            <Clock className="h-3 w-3" />
            {member.hourly_rate ? `$${member.hourly_rate}/hr` : 'Set pay rate'}
            <span className="text-xs opacity-70">(history)</span>
          </button>

          {/* License */}
          {member.license_number && (
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">License: {member.license_number}</span>
              {licenseStatus && (
                <Badge className={`text-xs ${licenseStatus.color}`}>{licenseStatus.text}</Badge>
              )}
            </div>
          )}

          {/* Certifications */}
          {member.certifications && member.certifications.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <Award className="h-3 w-3 text-muted-foreground" />
              {member.certifications.map(cert => (
                <Badge key={cert} variant="secondary" className="text-xs">{cert}</Badge>
              ))}
            </div>
          )}

          {/* Specialties */}
          {member.specialties && member.specialties.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {member.specialties.map(spec => (
                <Badge key={spec} variant="outline" className="text-xs">{spec}</Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamDialog({ 
  editingTeam, 
  onSave, 
  isLoading 
}: { 
  editingTeam: Team | null; 
  onSave: (data: Partial<Team>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<Team>>(
    editingTeam || {
      name: '',
      team_type: 'install',
      description: '',
      color: '#10B981',
      is_active: true,
      max_concurrent_jobs: 1
    }
  );

  useEffect(() => {
    setFormData(editingTeam || {
      name: '',
      team_type: 'install',
      description: '',
      color: '#10B981',
      is_active: true,
      max_concurrent_jobs: 1
    });
  }, [editingTeam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editingTeam ? 'Edit Team' : 'New Team'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Team Name</Label>
          <Input
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Install Crew A"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Team Type</Label>
            <Select
              value={formData.team_type}
              onValueChange={(v) => setFormData({ ...formData, team_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="install">Install</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <Input
              type="color"
              value={formData.color || '#10B981'}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Max Concurrent Jobs</Label>
          <Input
            type="number"
            min="1"
            value={formData.max_concurrent_jobs || 1}
            onChange={(e) => setFormData({ ...formData, max_concurrent_jobs: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional team description"
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Team'}
        </Button>
      </form>
    </DialogContent>
  );
}

function MemberDialog({ 
  editingMember, 
  onSave, 
  isLoading 
}: { 
  editingMember: TeamMember | null; 
  onSave: (data: Partial<TeamMember>) => void;
  isLoading: boolean;
}) {
  const defaultMember: Partial<TeamMember> = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'technician',
    member_type: 'technician',
    certifications: [],
    specialties: [],
    hourly_rate: null,
    overtime_rate: null,
    license_number: '',
    license_expiry: null,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    hire_date: null,
    is_active: true,
    notes: ''
  };

  const [formData, setFormData] = useState<Partial<TeamMember>>(editingMember || defaultMember);
  const [certInput, setCertInput] = useState('');
  const [specInput, setSpecInput] = useState('');

  useEffect(() => {
    setFormData(editingMember || defaultMember);
    setCertInput('');
    setSpecInput('');
  }, [editingMember]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addCert = () => {
    if (certInput.trim()) {
      setFormData({
        ...formData,
        certifications: [...(formData.certifications || []), certInput.trim()]
      });
      setCertInput('');
    }
  };

  const removeCert = (cert: string) => {
    setFormData({
      ...formData,
      certifications: (formData.certifications || []).filter(c => c !== cert)
    });
  };

  const addSpec = () => {
    if (specInput.trim()) {
      setFormData({
        ...formData,
        specialties: [...(formData.specialties || []), specInput.trim()]
      });
      setSpecInput('');
    }
  };

  const removeSpec = (spec: string) => {
    setFormData({
      ...formData,
      specialties: (formData.specialties || []).filter(s => s !== spec)
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editingMember ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name *</Label>
            <Input
              value={formData.first_name || ''}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input
              value={formData.last_name || ''}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </div>

        {/* Role & Type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Member Type</Label>
            <Select
              value={formData.member_type || 'technician'}
              onValueChange={(v) => setFormData({ ...formData, member_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="installer">Installer</SelectItem>
                <SelectItem value="lead_installer">Lead Installer</SelectItem>
                <SelectItem value="apprentice">Apprentice</SelectItem>
                <SelectItem value="helper">Helper</SelectItem>
                <SelectItem value="subcontractor">Subcontractor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={formData.role || 'technician'}
              onValueChange={(v) => setFormData({ ...formData, role: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="apprentice">Apprentice</SelectItem>
                <SelectItem value="helper">Helper</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pay Rates */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Hourly Rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.hourly_rate || ''}
              onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value ? parseFloat(e.target.value) : null })}
            />
          </div>
          <div className="space-y-2">
            <Label>Overtime Rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.overtime_rate || ''}
              onChange={(e) => setFormData({ ...formData, overtime_rate: e.target.value ? parseFloat(e.target.value) : null })}
            />
          </div>
          <div className="space-y-2">
            <Label>Hire Date</Label>
            <Input
              type="date"
              value={formData.hire_date || ''}
              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value || null })}
            />
          </div>
        </div>

        {/* License */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>License Number</Label>
            <Input
              value={formData.license_number || ''}
              onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              placeholder="e.g., TACLA12345"
            />
          </div>
          <div className="space-y-2">
            <Label>License Expiry</Label>
            <Input
              type="date"
              value={formData.license_expiry || ''}
              onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value || null })}
            />
          </div>
        </div>

        {/* Certifications */}
        <div className="space-y-2">
          <Label>Certifications</Label>
          <div className="flex gap-2">
            <Input
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              placeholder="e.g., EPA 608, NATE, OSHA 30"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCert(); } }}
            />
            <Button type="button" variant="outline" onClick={addCert}>Add</Button>
          </div>
          {formData.certifications && formData.certifications.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.certifications.map(cert => (
                <Badge key={cert} variant="secondary" className="gap-1">
                  {cert}
                  <button type="button" onClick={() => removeCert(cert)} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Specialties */}
        <div className="space-y-2">
          <Label>Specialties</Label>
          <div className="flex gap-2">
            <Input
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              placeholder="e.g., Ductless, Commercial, Controls"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpec(); } }}
            />
            <Button type="button" variant="outline" onClick={addSpec}>Add</Button>
          </div>
          {formData.specialties && formData.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.specialties.map(spec => (
                <Badge key={spec} variant="outline" className="gap-1">
                  {spec}
                  <button type="button" onClick={() => removeSpec(spec)} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Emergency Contact Name</Label>
            <Input
              value={formData.emergency_contact_name || ''}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Emergency Contact Phone</Label>
            <Input
              value={formData.emergency_contact_phone || ''}
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional notes about this team member"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Member'}
        </Button>
      </form>
    </DialogContent>
  );
}

function AssignMemberForm({ 
  teamId, 
  availableMembers, 
  onAssign, 
  isLoading 
}: { 
  teamId: string;
  availableMembers: TeamMember[];
  onAssign: (memberId: string, isLead: boolean, roleInTeam: string) => void;
  isLoading: boolean;
}) {
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [isLead, setIsLead] = useState(false);
  const [roleInTeam, setRoleInTeam] = useState('member');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMember) {
      onAssign(selectedMember, isLead, roleInTeam);
    }
  };

  if (availableMembers.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        All members are already assigned to this team
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Select Member</Label>
        <Select value={selectedMember} onValueChange={setSelectedMember}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a team member" />
          </SelectTrigger>
          <SelectContent>
            {availableMembers.map(member => (
              <SelectItem key={member.id} value={member.id}>
                {member.first_name} {member.last_name} - {member.role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Role in Team</Label>
        <Select value={roleInTeam} onValueChange={setRoleInTeam}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="backup">Backup</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isLead"
          checked={isLead}
          onChange={(e) => {
            setIsLead(e.target.checked);
            if (e.target.checked) setRoleInTeam('lead');
          }}
          className="rounded"
        />
        <Label htmlFor="isLead">Assign as Team Lead</Label>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading || !selectedMember}>
        {isLoading ? 'Assigning...' : 'Assign to Team'}
      </Button>
    </form>
  );
}
