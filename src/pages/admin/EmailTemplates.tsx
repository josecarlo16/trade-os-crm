import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  trigger_event: string | null;
  delay_hours: number | null;
  is_active: boolean;
  created_at: string;
};

export default function AdminEmailTemplates() {
  const queryClient = useQueryClient();
  const [editTemplate, setEditTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["crm-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate>) => {
      if (template.id) {
        const { error } = await supabase
          .from("crm_email_templates")
          .update({
            name: template.name,
            subject: template.subject,
            body_html: template.body_html,
            trigger_event: template.trigger_event,
            delay_hours: template.delay_hours,
            is_active: template.is_active,
          })
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("crm_email_templates")
          .insert({
            name: template.name!,
            subject: template.subject!,
            body_html: template.body_html || "",
            trigger_event: template.trigger_event,
            delay_hours: template.delay_hours || 0,
            is_active: template.is_active ?? true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Template saved" });
      setIsDialogOpen(false);
      setEditTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["crm-email-templates"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template deleted" });
      queryClient.invalidateQueries({ queryKey: ["crm-email-templates"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("crm_email_templates")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-email-templates"] });
    },
  });

  const openNew = () => {
    setEditTemplate({ name: "", subject: "", body_html: "", trigger_event: "", delay_hours: 0, is_active: true });
    setIsDialogOpen(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditTemplate({ ...t });
    setIsDialogOpen(true);
  };

  return (
    <AdminLayout title="Email Templates">
      <div className="flex justify-end mb-4">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Delay (hrs)</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No templates yet</TableCell>
              </TableRow>
            ) : (
              templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm">{t.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.trigger_event || "—"}</TableCell>
                  <TableCell>{t.delay_hours || 0}</TableCell>
                  <TableCell>
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: t.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTemplate?.id ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editTemplate?.name || ""}
                onChange={(e) => setEditTemplate((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={editTemplate?.subject || ""}
                onChange={(e) => setEditTemplate((prev) => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div>
              <Label>Body (HTML)</Label>
              <Textarea
                value={editTemplate?.body_html || ""}
                onChange={(e) => setEditTemplate((prev) => ({ ...prev, body_html: e.target.value }))}
                className="min-h-[200px] font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Trigger Event</Label>
                <Input
                  value={editTemplate?.trigger_event || ""}
                  onChange={(e) => setEditTemplate((prev) => ({ ...prev, trigger_event: e.target.value }))}
                  placeholder="e.g., new_lead, job_completed"
                />
              </div>
              <div>
                <Label>Delay (hours)</Label>
                <Input
                  type="number"
                  value={editTemplate?.delay_hours || 0}
                  onChange={(e) => setEditTemplate((prev) => ({ ...prev, delay_hours: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editTemplate && saveMutation.mutate(editTemplate)}
              disabled={saveMutation.isPending || !editTemplate?.name || !editTemplate?.subject}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
