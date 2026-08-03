import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Calendar, CheckCircle2, Star, Users, Briefcase, Plus, User, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, addHours } from "date-fns";

interface GoogleCalendar {
  id: string;
  calendar_id: string;
  name: string;
  description: string | null;
  color: string;
  is_primary: boolean;
  is_active: boolean;
  linked_job_type_id: string | null;
  linked_team_id: string | null;
  linked_member_id: string | null;
  last_synced_at: string | null;
}

export default function CalendarSettings() {
  const [syncing, setSyncing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCalendarId, setNewCalendarId] = useState("");
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();

  const { data: calendars, isLoading } = useQuery({
    queryKey: ["google-calendars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendars")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as GoogleCalendar[];
    },
  });

  const { data: jobTypes } = useQuery({
    queryKey: ["job-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_job_types")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_teams")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_team_members")
        .select("id, first_name, last_name, email")
        .eq("is_active", true)
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "sync-calendars" },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["google-calendars"] });
      toast.success(`Synced ${data.calendars?.length || 0} calendars from Google`);
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const updateCalendarMutation = useMutation({
    mutationFn: async (updates: Partial<GoogleCalendar> & { id: string }) => {
      const { id, ...data } = updates;
      
      // If setting as primary, unset other primaries first
      if (data.is_primary) {
        await supabase
          .from("google_calendars")
          .update({ is_primary: false })
          .neq("id", id);
      }

      const { error } = await supabase
        .from("google_calendars")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendars"] });
      toast.success("Calendar updated");
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const addCalendarMutation = useMutation({
    mutationFn: async (calendarId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "add-calendar", calendarId },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendars"] });
      toast.success("Calendar added successfully");
      setAddDialogOpen(false);
      setNewCalendarId("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add calendar: ${error.message}`);
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncMutation.mutateAsync();
    } finally {
      setSyncing(false);
    }
  };

  const handleAddCalendar = async () => {
    if (!newCalendarId.trim()) {
      toast.error("Please enter a Calendar ID");
      return;
    }
    setAdding(true);
    try {
      await addCalendarMutation.mutateAsync(newCalendarId.trim());
    } finally {
      setAdding(false);
    }
  };

  return (
    <AdminLayout title="Calendar Settings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Calendar Settings</h1>
            <p className="text-muted-foreground">
              Manage Google Calendars synced with your CRM
            </p>
            {(() => {
              const lastSynced = calendars?.reduce((latest, cal) => {
                if (!cal.last_synced_at) return latest;
                const d = new Date(cal.last_synced_at);
                return !latest || d > latest ? d : latest;
              }, null as Date | null);
              const nextSync = lastSynced ? addHours(lastSynced, 2) : null;
              return (
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Auto-syncs every 2 hours
                    {nextSync && ` · Next sync ${formatDistanceToNow(nextSync, { addSuffix: true })}`}
                  </span>
                </div>
              );
            })()}
          </div>
          <div className="flex gap-2">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Calendar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Calendar Manually</DialogTitle>
                  <DialogDescription>
                    Enter the Calendar ID from Google Calendar settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="calendarId">Calendar ID</Label>
                    <Input
                      id="calendarId"
                      placeholder="e.g., c_abc123@group.calendar.google.com"
                      value={newCalendarId}
                      onChange={(e) => setNewCalendarId(e.target.value)}
                    />
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-sm space-y-2">
                    <p className="font-medium">Where to find your Calendar ID:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Open Google Calendar settings</li>
                      <li>Click on your calendar name</li>
                      <li>Scroll to "Integrate calendar"</li>
                      <li>Copy the "Calendar ID"</li>
                    </ol>
                    <p className="text-muted-foreground mt-2">
                      Make sure the calendar is shared with:
                    </p>
                    <code className="text-xs block bg-background p-2 rounded break-all">
                      truficient-admin-sync@truficient-estimator-465520.iam.gserviceaccount.com
                    </code>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCalendar} disabled={adding}>
                    {adding ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Calendar"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Calendars"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !calendars?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Calendars Found</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Share your Google Calendars with the service account email, then click
                "Sync Calendars" to import them.
              </p>
              <div className="bg-muted rounded-lg p-3 max-w-lg mx-auto">
                <code className="text-sm break-all">
                  truficient-admin-sync@truficient-estimator-465520.iam.gserviceaccount.com
                </code>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {calendars.map((calendar) => (
              <Card key={calendar.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <label className="relative cursor-pointer group">
                        <div
                          className="w-5 h-5 rounded-full ring-2 ring-offset-2 ring-offset-background ring-transparent group-hover:ring-primary/40 transition-all"
                          style={{ backgroundColor: calendar.color }}
                        />
                        <input
                          type="color"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          value={calendar.color}
                          onChange={(e) =>
                            updateCalendarMutation.mutate({
                              id: calendar.id,
                              color: e.target.value,
                            })
                          }
                        />
                      </label>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {calendar.name}
                          {calendar.is_primary && (
                            <Badge variant="default" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Primary
                            </Badge>
                          )}
                        </CardTitle>
                        {calendar.description && (
                          <CardDescription>{calendar.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Active</span>
                      <Switch
                        checked={calendar.is_active}
                        onCheckedChange={(checked) =>
                          updateCalendarMutation.mutate({
                            id: calendar.id,
                            is_active: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">
                        Set as Primary
                      </label>
                      <Button
                        variant={calendar.is_primary ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          updateCalendarMutation.mutate({
                            id: calendar.id,
                            is_primary: !calendar.is_primary,
                          })
                        }
                      >
                        {calendar.is_primary ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Primary Calendar
                          </>
                        ) : (
                          "Make Primary"
                        )}
                      </Button>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        Link to Job Type
                      </label>
                      <Select
                        value={calendar.linked_job_type_id || "none"}
                        onValueChange={(value) =>
                          updateCalendarMutation.mutate({
                            id: calendar.id,
                            linked_job_type_id: value === "none" ? null : value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {jobTypes?.map((jt) => (
                            <SelectItem key={jt.id} value={jt.id}>
                              {jt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Link to Team
                      </label>
                      <Select
                        value={calendar.linked_team_id || "none"}
                        onValueChange={(value) =>
                          updateCalendarMutation.mutate({
                            id: calendar.id,
                            linked_team_id: value === "none" ? null : value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {teams?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                        <User className="h-4 w-4" />
                        Link to Member
                      </label>
                      <Select
                        value={calendar.linked_member_id || "none"}
                        onValueChange={(value) =>
                          updateCalendarMutation.mutate({
                            id: calendar.id,
                            linked_member_id: value === "none" ? null : value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {teamMembers?.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.first_name} {m.last_name || ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {calendar.last_synced_at && (
                    <p className="text-xs text-muted-foreground">
                      Last synced:{" "}
                      {new Date(calendar.last_synced_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
