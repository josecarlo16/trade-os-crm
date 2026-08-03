import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Star, Code } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";

type EmailSignature = {
  id: string;
  name: string;
  signature_html: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function SignatureEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const [showHtml, setShowHtml] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Underline,
      Image,
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  const handleHtmlChange = (html: string) => {
    onChange(html);
    if (editor) {
      editor.commands.setContent(html);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Signature</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => setShowHtml(!showHtml)}
        >
          <Code className="h-3.5 w-3.5" />
          {showHtml ? "Visual Editor" : "View HTML"}
        </Button>
      </div>

      {showHtml ? (
        <Textarea
          value={value}
          onChange={(e) => handleHtmlChange(e.target.value)}
          className="min-h-[200px] font-mono text-xs"
          placeholder="<p>Best regards,<br>Bach Nguyen</p>"
        />
      ) : (
        <div className="border rounded-md">
          {/* Mini toolbar */}
          {editor && (
            <div className="flex flex-wrap gap-0.5 border-b p-1.5 bg-muted/30">
              <Button
                type="button"
                variant={editor.isActive("bold") ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 text-xs font-bold"
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                B
              </Button>
              <Button
                type="button"
                variant={editor.isActive("italic") ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 text-xs italic"
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                I
              </Button>
              <Button
                type="button"
                variant={editor.isActive("underline") ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 text-xs underline"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                U
              </Button>
              <div className="w-px bg-border mx-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  const url = window.prompt("Link URL:");
                  if (url) {
                    editor.chain().focus().setLink({ href: url }).run();
                  }
                }}
              >
                Link
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  const url = window.prompt("Image URL:");
                  if (url) {
                    editor.chain().focus().setImage({ src: url }).run();
                  }
                }}
              >
                Image
              </Button>
            </div>
          )}
          <EditorContent
            editor={editor}
            className="p-3 min-h-[160px] prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[140px]"
          />
        </div>
      )}
    </div>
  );
}

export function EmailSignaturesTab() {
  const queryClient = useQueryClient();
  const [editSig, setEditSig] = useState<Partial<EmailSignature> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewSig, setPreviewSig] = useState<EmailSignature | null>(null);

  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ["email-signatures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_signatures")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailSignature[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (sig: Partial<EmailSignature>) => {
      if (sig.is_default) {
        await supabase.from("email_signatures").update({ is_default: false }).eq("is_default", true);
      }
      if (sig.id) {
        const { error } = await supabase
          .from("email_signatures")
          .update({ name: sig.name, signature_html: sig.signature_html, is_default: sig.is_default, is_active: sig.is_active })
          .eq("id", sig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_signatures")
          .insert({ name: sig.name!, signature_html: sig.signature_html || "", is_default: sig.is_default ?? false, is_active: sig.is_active ?? true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Signature saved" });
      setIsDialogOpen(false);
      setEditSig(null);
      queryClient.invalidateQueries({ queryKey: ["email-signatures"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_signatures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Signature deleted" });
      queryClient.invalidateQueries({ queryKey: ["email-signatures"] });
    },
  });

  const openNew = () => {
    setEditSig({ name: "", signature_html: "", is_default: false, is_active: true });
    setIsDialogOpen(true);
  };

  const openEdit = (s: EmailSignature) => {
    setEditSig({ ...s });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Create and manage email signatures for outbound emails.</p>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> New Signature
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : signatures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No signatures yet. Create one to include in your emails.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {signatures.map((sig) => (
            <Card key={sig.id} className={!sig.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {sig.name}
                    {sig.is_default && <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 mr-1" />Default</Badge>}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setPreviewSig(sig)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(sig)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(sig.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Show rendered preview on cards instead of raw HTML */}
                <div
                  className="text-xs text-muted-foreground line-clamp-3 bg-muted/50 rounded p-2 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sig.signature_html.substring(0, 300) }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editSig?.id ? "Edit Signature" : "New Signature"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editSig?.name || ""}
                onChange={(e) => setEditSig((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Bach - Sales"
              />
            </div>

            {/* Rich-text editor with optional HTML toggle */}
            {editSig && (
              <SignatureEditor
                key={editSig.id || "new"}
                value={editSig.signature_html || ""}
                onChange={(html) => setEditSig((p) => ({ ...p, signature_html: html }))}
              />
            )}

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editSig?.is_default ?? false}
                  onCheckedChange={(checked) => setEditSig((p) => ({ ...p, is_default: checked }))}
                />
                <Label>Set as default</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editSig?.is_active ?? true}
                  onCheckedChange={(checked) => setEditSig((p) => ({ ...p, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editSig && saveMutation.mutate(editSig)}
              disabled={saveMutation.isPending || !editSig?.name}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewSig} onOpenChange={() => setPreviewSig(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview: {previewSig?.name}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-md p-4 bg-background prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewSig?.signature_html || "" }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
