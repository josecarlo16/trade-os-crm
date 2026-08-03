import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Code, ChevronDown, UserPlus } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  cc_emails: string | null;
  trigger_event: string | null;
  delay_hours: number | null;
  is_active: boolean;
  created_at: string;
};

const MERGE_TAGS = [
  {
    label: "Customer",
    tags: [
      { tag: "{{first_name}}", label: "First Name" },
      { tag: "{{last_name}}", label: "Last Name" },
      { tag: "{{email}}", label: "Email" },
      { tag: "{{phone}}", label: "Phone" },
      { tag: "{{address}}", label: "Full Address" },
      { tag: "{{customer_type}}", label: "Customer Type" },
      { tag: "{{customer_status}}", label: "Status" },
    ],
  },
  {
    label: "Job / Service",
    tags: [
      { tag: "{{job_number}}", label: "Job Number" },
      { tag: "{{job_type}}", label: "Job Type" },
      { tag: "{{scheduled_date}}", label: "Scheduled Date" },
      { tag: "{{quoted_amount}}", label: "Quoted Amount" },
      { tag: "{{job_title}}", label: "Job Title" },
    ],
  },
  {
    label: "Company / Sender",
    tags: [
      { tag: "{{company_name}}", label: "Company Name" },
      { tag: "{{sender_name}}", label: "Sender Name" },
      { tag: "{{sender_email}}", label: "Sender Email" },
      { tag: "{{sender_phone}}", label: "Sender Phone" },
    ],
  },
  {
    label: "Location / Property",
    tags: [
      { tag: "{{property_address}}", label: "Property Address" },
      { tag: "{{city}}", label: "City" },
      { tag: "{{state}}", label: "State" },
      { tag: "{{zip}}", label: "Zip Code" },
      { tag: "{{county}}", label: "County" },
    ],
  },
];

function MergeTagPicker({ onInsert }: { onInsert: (tag: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Code className="h-3.5 w-3.5 mr-1.5" /> Insert Variable <ChevronDown className="h-3.5 w-3.5 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 max-h-80 overflow-y-auto" align="start">
        {MERGE_TAGS.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">{group.label}</p>
            <div className="flex flex-wrap gap-1 px-1">
              {group.tags.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  onClick={() => { onInsert(t.tag); setOpen(false); }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function TemplateBodyEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showHtml, setShowHtml] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Underline,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const insertMergeTag = (tag: string) => {
    if (showHtml) {
      onChange((value || "") + tag);
    } else if (editor) {
      editor.chain().focus().insertContent(tag).run();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Body</Label>
        <div className="flex items-center gap-2">
          <MergeTagPicker onInsert={insertMergeTag} />
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              if (showHtml && editor) {
                editor.commands.setContent(value || "");
              }
              setShowHtml(!showHtml);
            }}
          >
            {showHtml ? "Visual Editor" : "View HTML"}
          </Button>
        </div>
      </div>
      {showHtml ? (
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[200px] font-mono text-xs"
        />
      ) : (
        <div className="border rounded-md p-3 min-h-[200px] prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px]">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}

export function EmailTemplatesTab() {
  const queryClient = useQueryClient();
  const [editTemplate, setEditTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const { data: staffMembers = [] } = useQuery({
    queryKey: ["crm-staff-for-cc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_team_members")
        .select("id, first_name, last_name, email")
        .eq("is_active", true)
        .not("email", "is", null)
        .order("first_name");
      if (error) throw error;
      return data as { id: string; first_name: string; last_name: string | null; email: string }[];
    },
  });

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
            cc_emails: template.cc_emails || null,
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
            cc_emails: template.cc_emails || null,
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
      const { error } = await supabase.from("crm_email_templates").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-email-templates"] });
    },
  });

  const openNew = () => {
    setEditTemplate({ name: "", subject: "", body_html: "", cc_emails: "", trigger_event: "", delay_hours: 0, is_active: true });
    setIsDialogOpen(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditTemplate({ ...t });
    setIsDialogOpen(true);
  };

  const insertIntoSubject = (tag: string) => {
    const input = subjectInputRef.current;
    if (input) {
      const start = input.selectionStart ?? (editTemplate?.subject?.length || 0);
      const end = input.selectionEnd ?? start;
      const current = editTemplate?.subject || "";
      const newValue = current.slice(0, start) + tag + current.slice(end);
      setEditTemplate((p) => ({ ...p, subject: newValue }));
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else {
      setEditTemplate((p) => ({ ...p, subject: (p?.subject || "") + tag }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Create email templates with merge tags for personalized outreach.</p>
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
              <TableHead className="w-[120px]">Actions</TableHead>
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
                      <Button variant="ghost" size="icon" onClick={() => setPreviewTemplate(t)}>
                        <Eye className="h-4 w-4" />
                      </Button>
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

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTemplate?.id ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editTemplate?.name || ""}
                onChange={(e) => setEditTemplate((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Subject</Label>
                <MergeTagPicker onInsert={insertIntoSubject} />
              </div>
              <Input
                ref={subjectInputRef}
                value={editTemplate?.subject || ""}
                onChange={(e) => setEditTemplate((p) => ({ ...p, subject: e.target.value }))}
              />
            </div>
            <div>
              <Label>CC Recipients</Label>
              <div className="flex gap-2 mb-2">
                <Select
                  value=""
                  onValueChange={(email) => {
                    const current = editTemplate?.cc_emails || "";
                    const existing = current.split(",").map((e) => e.trim()).filter(Boolean);
                    if (!existing.includes(email)) {
                      const updated = existing.length > 0 ? `${current}, ${email}` : email;
                      setEditTemplate((p) => ({ ...p, cc_emails: updated }));
                    }
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <UserPlus className="h-3.5 w-3.5" />
                      <span className="text-sm">Add staff member</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.filter((m) => m.email).map((m) => (
                      <SelectItem key={m.id} value={m.email!}>
                        {m.first_name} {m.last_name || ""} — {m.email}
                      </SelectItem>
                    ))}
                    {staffMembers.length === 0 && (
                      <SelectItem value="_none" disabled>No staff with email found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={editTemplate?.cc_emails || ""}
                onChange={(e) => setEditTemplate((p) => ({ ...p, cc_emails: e.target.value }))}
                placeholder="cc1@example.com, cc2@example.com"
              />
              <p className="text-xs text-muted-foreground mt-1">Select staff above or type emails manually (comma-separated)</p>
            </div>
            <TemplateBodyEditor
              key={editTemplate?.id || "new"}
              value={editTemplate?.body_html || ""}
              onChange={(v) => setEditTemplate((p) => ({ ...p, body_html: v }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Trigger Event</Label>
                <Input
                  value={editTemplate?.trigger_event || ""}
                  onChange={(e) => setEditTemplate((p) => ({ ...p, trigger_event: e.target.value }))}
                  placeholder="e.g., new_lead, job_completed"
                />
              </div>
              <div>
                <Label>Delay (hours)</Label>
                <Input
                  type="number"
                  value={editTemplate?.delay_hours || 0}
                  onChange={(e) => setEditTemplate((p) => ({ ...p, delay_hours: parseInt(e.target.value) || 0 }))}
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

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm"><strong>Subject:</strong> {previewTemplate?.subject}</p>
            <div className="border rounded-md p-4 bg-background" dangerouslySetInnerHTML={{ __html: previewTemplate?.body_html || "" }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
