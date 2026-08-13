import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, freshChannel } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "@/hooks/use-toast";
import { Mail, Send, Sparkles, RefreshCw, ArrowLeft, User, Search, Loader2, PenSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type EmailLog = {
  id: string;
  customer_id: string | null;
  direction: string;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  from_email: string;
  to_email: string;
  status: string;
  is_read: boolean;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
};

type Conversation = {
  customer_id: string | null;
  email: string;
  customer_name: string | null;
  last_subject: string | null;
  last_time: string;
  unread_count: number;
  emails: EmailLog[];
};

function CustomerSearchCombobox({
  customers,
  selectedId,
  onSelect,
}: {
  customers: { id: string; first_name: string | null; last_name: string | null; email: string | null }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const filtered = customers.filter((c) => c.email);
  const selected = filtered.find((c) => c.id === selectedId);
  const displayLabel = selected
    ? `${selected.first_name || ""} ${selected.last_name || ""}`.trim() + (selected.email ? ` — ${selected.email}` : "")
    : "Search customers...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className="truncate">{displayLabel}</span>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type a name or email..." />
          <CommandList>
            <CommandEmpty>No customers found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((c) => {
                const name = `${c.first_name || ""} ${c.last_name || ""}`.trim();
                return (
                  <CommandItem
                    key={c.id}
                    value={`${name} ${c.email || ""}`}
                    onSelect={() => { onSelect(c.id); setOpen(false); }}
                  >
                    <span className="truncate">{name || c.email} {name && c.email ? `— ${c.email}` : ""}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminInbox() {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "awaiting" | "sent">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCustomerId, setComposeCustomerId] = useState<string | null>(null);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSignatureId, setComposeSignatureId] = useState<string>("");
  const [composeTemplateId, setComposeTemplateId] = useState<string>("");
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Fetch all emails
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["crm-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  // Fetch customers for name mapping
  const { data: customers = [] } = useQuery({
    queryKey: ["crm-customers-email-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_customers")
        .select("id, first_name, last_name, email, phone, customer_type, customer_status");
      if (error) throw error;
      return data;
    },
  });

  // Fetch email signatures
  const { data: signatures = [] } = useQuery({
    queryKey: ["email-signatures-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_signatures")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch email templates
  const { data: emailTemplates = [] } = useQuery({
    queryKey: ["crm-email-templates-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Group emails into conversations by customer or email
  const conversations: Conversation[] = (() => {
    const groups = new Map<string, EmailLog[]>();

    emails.forEach((email) => {
      const key = email.customer_id || (email.direction === "inbound" ? email.from_email : email.to_email);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(email);
    });

    return Array.from(groups.entries()).map(([key, emailList]) => {
      const sorted = [...emailList].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const last = sorted[sorted.length - 1];
      const contactEmail = last.direction === "inbound" ? last.from_email : last.to_email;
      const customer = customers.find((c) => c.id === last.customer_id || c.email === contactEmail);
      const unreadCount = emailList.filter((e) => !e.is_read && e.direction === "inbound").length;

      return {
        customer_id: last.customer_id,
        email: contactEmail,
        customer_name: customer ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() : null,
        last_subject: last.subject,
        last_time: last.sent_at || last.received_at || last.created_at,
        unread_count: unreadCount,
        emails: sorted,
      };
    }).filter((conv) => {
      if (filter === "unread") return conv.unread_count > 0;
      if (filter === "awaiting") {
        const last = conv.emails[conv.emails.length - 1];
        return last.direction === "inbound";
      }
      if (filter === "sent") {
        const last = conv.emails[conv.emails.length - 1];
        return last.direction === "outbound";
      }
      return true;
    }).filter((conv) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        conv.email.toLowerCase().includes(q) ||
        (conv.customer_name?.toLowerCase().includes(q) ?? false) ||
        conv.emails.some((e) => e.subject?.toLowerCase().includes(q))
      );
    }).sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());
  })();

  // Realtime subscription
  useEffect(() => {
    const channel = freshChannel("crm-email-log-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "crm_email_log" }, () => {
        queryClient.invalidateQueries({ queryKey: ["crm-emails"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Scroll to bottom on conversation change
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation]);

  // Send email mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation || !replySubject || !replyBody) throw new Error("Missing fields");
      const { data, error } = await supabase.functions.invoke("send-crm-email", {
        body: {
          to: selectedConversation.email,
          subject: replySubject,
          bodyText: replyBody,
          bodyHtml: `<p>${replyBody.replace(/\n/g, "<br>")}</p>`,
          customerId: selectedConversation.customer_id,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Email sent successfully" });
      setReplyBody("");
      queryClient.invalidateQueries({ queryKey: ["crm-emails"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    },
  });

  // AI draft mutation
  const draftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation) throw new Error("No conversation selected");
      const threadContext = selectedConversation.emails
        .slice(-5)
        .map((e) => `[${e.direction}] ${e.subject}: ${e.body_text?.substring(0, 200) || ""}`)
        .join("\n");

      const { data, error } = await supabase.functions.invoke("generate-email-draft", {
        body: {
          customerId: selectedConversation.customer_id,
          threadContext,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data.subject) setReplySubject(data.subject);
      if (data.body) setReplyBody(data.body);
      toast({ title: "Draft generated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to generate draft", description: err.message, variant: "destructive" });
    },
  });

  // Sync Gmail mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-gmail-replies");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({ title: `Synced ${data?.synced || 0} new emails` });
      queryClient.invalidateQueries({ queryKey: ["crm-emails"] });
    },
    onError: (err: Error) => {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  // Mark emails as read when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;
    const unreadIds = selectedConversation.emails
      .filter((e) => !e.is_read && e.direction === "inbound")
      .map((e) => e.id);
    if (unreadIds.length === 0) return;

    supabase
      .from("crm_email_log")
      .update({ is_read: true })
      .in("id", unreadIds)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["crm-emails"] });
      });
  }, [selectedConversation?.email]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileThread(true);
    const lastEmail = conv.emails[conv.emails.length - 1];
    const subj = lastEmail.subject || "";
    setReplySubject(subj.startsWith("Re:") ? subj : `Re: ${subj}`);
    setReplyBody("");
  };

  // Compose new email mutation
  const composeMutation = useMutation({
    mutationFn: async () => {
      if (!composeTo || !composeSubject || !composeBody) throw new Error("Missing fields");
      // Append signature if selected
      const selectedSig = signatures.find((s: any) => s.id === composeSignatureId);
      const bodyWithSig = selectedSig
        ? `${composeBody}\n\n---\n${selectedSig.signature_html.replace(/<[^>]*>/g, '')}`
        : composeBody;
      const htmlWithSig = selectedSig
        ? `<p>${composeBody.replace(/\n/g, "<br>")}</p><br/><hr/>${selectedSig.signature_html}`
        : `<p>${composeBody.replace(/\n/g, "<br>")}</p>`;
      const ccList = composeCc.split(",").map(s => s.trim()).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("send-crm-email", {
        body: {
          to: composeTo,
          cc: ccList.length > 0 ? ccList : undefined,
          subject: composeSubject,
          bodyText: bodyWithSig,
          bodyHtml: htmlWithSig,
          customerId: composeCustomerId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Email sent successfully" });
      setIsComposeOpen(false);
      setComposeTo("");
      setComposeCustomerId(null);
      setComposeSubject("");
      setComposeBody("");
      setComposeCc("");
      setComposeSignatureId("");
      setComposeTemplateId("");
      queryClient.invalidateQueries({ queryKey: ["crm-emails"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    },
  });

  const handleComposeSelectCustomer = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setComposeCustomerId(customerId);
      setComposeTo(customer.email || "");
    }
  };

  const resolveMergeTags = (text: string, customerId: string | null) => {
    const customer = customers?.find((c: any) => c.id === customerId);
    const replacements: Record<string, string> = {
      "{{first_name}}": customer?.first_name || "",
      "{{last_name}}": customer?.last_name || "",
      "{{email}}": customer?.email || "",
      "{{phone}}": customer?.phone || "",
      "{{customer_type}}": customer?.customer_type || "",
      "{{customer_status}}": customer?.customer_status || "",
      "{{company_name}}": "Truficient",
      "{{sender_name}}": "Bach",
      "{{sender_email}}": "bach@truficient.com",
    };
    let result = text;
    for (const [tag, value] of Object.entries(replacements)) {
      result = result.split(tag).join(value);
    }
    return result;
  };

  const htmlToPlainText = (html: string): string => {
    let text = html;
    // Convert block elements to newlines
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<\/div>/gi, "\n");
    text = text.replace(/<\/h[1-6]>/gi, "\n\n");
    text = text.replace(/<\/li>/gi, "\n");
    // Strip remaining tags
    text = text.replace(/<[^>]*>/g, "");
    // Decode common entities
    text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    // Trim excess blank lines
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    return text;
  };

  const handleComposeSelectTemplate = (templateId: string) => {
    setComposeTemplateId(templateId);
    const template = emailTemplates.find((t: any) => t.id === templateId);
    if (template) {
      const resolvedSubject = resolveMergeTags(template.subject, composeCustomerId);
      const resolvedBody = resolveMergeTags(template.body_html, composeCustomerId);
      setComposeSubject(resolvedSubject);
      setComposeBody(htmlToPlainText(resolvedBody));
      if (template.cc_emails) setComposeCc(template.cc_emails);
    }
  };

  // Auto-select default signature when compose opens
  const handleOpenCompose = () => {
    setIsComposeOpen(true);
    const defaultSig = signatures.find((s: any) => s.is_default);
    if (defaultSig) setComposeSignatureId(defaultSig.id);
  };

  return (
    <AdminLayout
      title="Inbox"
    >
      <div className="flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-background">
        {/* Left panel - Conversation list */}
        <div className={cn(
          "w-full md:w-[360px] border-r flex flex-col",
          showMobileThread && "hidden md:flex"
        )}>
          {/* Search + Sync */}
          <div className="p-3 border-b space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Button size="sm" variant="outline" onClick={handleOpenCompose}>
                <PenSquare className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
              </Button>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="w-full h-8">
                <TabsTrigger value="all" className="text-xs flex-1">All</TabsTrigger>
                <TabsTrigger value="unread" className="text-xs flex-1">Unread</TabsTrigger>
                <TabsTrigger value="awaiting" className="text-xs flex-1">Awaiting</TabsTrigger>
                <TabsTrigger value="sent" className="text-xs flex-1">Sent</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conversation list */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No conversations found</div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.customer_id || conv.email}
                  onClick={() => handleSelectConversation(conv)}
                  className={cn(
                    "w-full text-left p-3 border-b hover:bg-muted/50 transition-colors",
                    selectedConversation?.email === conv.email && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {conv.unread_count > 0 && (
                        <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className={cn("text-sm truncate", conv.unread_count > 0 && "font-semibold")}>
                          {conv.customer_name || conv.email}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.last_time), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.last_subject || "(no subject)"}
                      </p>
                      {!conv.customer_name && (
                        <p className="text-xs text-muted-foreground/60 truncate">{conv.email}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Right panel - Thread view */}
        <div className={cn(
          "flex-1 flex flex-col",
          !showMobileThread && "hidden md:flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Thread header */}
              <div className="p-3 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8"
                  onClick={() => setShowMobileThread(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <User className="h-8 w-8 text-muted-foreground p-1 border rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedConversation.customer_name || selectedConversation.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{selectedConversation.email}</p>
                </div>
                {selectedConversation.customer_id && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/admin/customers/${selectedConversation.customer_id}`}>View Profile</a>
                  </Button>
                )}
              </div>

              {/* Email thread */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {selectedConversation.emails.map((email) => (
                    <div
                      key={email.id}
                      className={cn(
                        "max-w-[80%] rounded-lg p-3",
                        email.direction === "outbound"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "mr-auto bg-muted"
                      )}
                    >
                      <p className="text-xs font-medium mb-1 opacity-80">{email.subject || "(no subject)"}</p>
                      <div
                        className="text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: email.body_text || email.body_html?.replace(/<[^>]*>/g, "") || "(empty)",
                        }}
                      />
                      <p className="text-xs mt-2 opacity-60">
                        {email.sent_at || email.received_at
                          ? formatDistanceToNow(new Date(email.sent_at || email.received_at!), { addSuffix: true })
                          : ""}
                      </p>
                    </div>
                  ))}
                  <div ref={threadEndRef} />
                </div>
              </ScrollArea>

              {/* Reply composer */}
              <div className="border-t p-3 space-y-2">
                <Input
                  placeholder="Subject"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="h-8 text-sm"
                />
                <Textarea
                  placeholder="Write your reply..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => draftMutation.mutate()}
                    disabled={draftMutation.isPending}
                  >
                    {draftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    Draft with AI
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending || !replyBody || !replySubject}
                  >
                    {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a conversation to view</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>To (search customer or type email)</Label>
              <CustomerSearchCombobox
                customers={customers}
                selectedId={composeCustomerId}
                onSelect={handleComposeSelectCustomer}
              />
              <Input
                placeholder="Or type email address directly..."
                value={composeTo}
                onChange={(e) => { setComposeTo(e.target.value); setComposeCustomerId(null); }}
                className="mt-2"
              />
            </div>
            <div>
              <Label>CC (comma-separated)</Label>
              <Input
                placeholder="cc1@example.com, cc2@example.com"
                value={composeCc}
                onChange={(e) => setComposeCc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template</Label>
                <Select onValueChange={handleComposeSelectTemplate} value={composeTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTemplates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Signature</Label>
                <Select onValueChange={setComposeSignatureId} value={composeSignatureId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select signature..." />
                  </SelectTrigger>
                  <SelectContent>
                    {signatures.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.is_default ? "(Default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                className="min-h-[150px]"
                placeholder="Write your email..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
            <Button
              onClick={() => composeMutation.mutate()}
              disabled={composeMutation.isPending || !composeTo || !composeSubject || !composeBody}
            >
              {composeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
