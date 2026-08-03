import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailSignaturesTab } from "@/components/admin/email-settings/EmailSignaturesTab";
import { EmailTemplatesTab } from "@/components/admin/email-settings/EmailTemplatesTab";

export default function AdminEmailSettings() {
  return (
    <AdminLayout title="Email Settings">
      <Tabs defaultValue="signatures" className="space-y-4">
        <TabsList>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="signatures">
          <EmailSignaturesTab />
        </TabsContent>
        <TabsContent value="templates">
          <EmailTemplatesTab />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
