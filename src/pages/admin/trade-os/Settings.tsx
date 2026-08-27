import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { toRoleTemplate, ROLE_LABEL } from '@/lib/tradeOSRoles';

export default function TradeOSSettingsPage() {
  const { role } = useUserRole();
  const roleTemplate = toRoleTemplate(role);

  return (
    <Card className="bg-tradeos-surface border-tradeos-line">
      <CardHeader className="border-b border-tradeos-line py-3">
        <CardTitle className="font-condensed text-sm font-bold uppercase tracking-wider text-tradeos-ink">
          Company
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-tradeos-line pt-2">
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-semibold text-tradeos-ink">Truficient Heating &amp; Air</p>
            <p className="text-xs text-tradeos-ink-3">Dallas–Fort Worth, TX · tenant #1</p>
          </div>
          <Badge variant="outline" className="border-tradeos-line-strong text-tradeos-ink-2">Live</Badge>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-semibold text-tradeos-ink">Your role</p>
            <p className="text-xs text-tradeos-ink-3">Role templates: Owner/Admin, Back-Office Manager, Tech</p>
          </div>
          <Badge variant="outline" className="border-tradeos-line-strong text-tradeos-ink-2">
            {roleTemplate ? ROLE_LABEL[roleTemplate] : '—'}
          </Badge>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-semibold text-tradeos-ink">Model routing</p>
            <p className="text-xs text-tradeos-ink-3">Claude for structured tasks, Gemini for voice/translation</p>
          </div>
          <Badge variant="outline" className="border-tradeos-line-strong text-tradeos-ink-2">Active</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
