import { Route, Routes } from 'react-router-dom';
import { TradeOSLayout } from '@/components/tradeos/TradeOSLayout';
import TradeOSDashboardPage from './Dashboard';
import TradeOSForemanPage from './Foreman';
import TradeOSCrmPage from './Crm';
import TradeOSWorkEdgePage from './WorkEdge';
import TradeOSOttoPayPage from './OttoPay';
import TradeOSSocialPage from './Social';
import TradeOSReportingPage from './Reporting';
import TradeOSMessagesPage from './Messages';
import TradeOSAnalyticsPage from './Analytics';
import TradeOSSettingsPage from './Settings';

/**
 * Mounted at /admin/trade-os/* — its own sidebar (TradeOSSidebar) replaces
 * the standard AdminLayout shell for everything under this path, matching
 * the client-approved dashboard mockup. Sub-routes are nested React Router
 * routes, not a JS-only tab switch, so each module has a real, bookmarkable
 * URL and direct access is still gated by RoleGate per page.
 */
export default function TradeOSApp() {
  return (
    <TradeOSLayout>
      <Routes>
        <Route index element={<TradeOSDashboardPage />} />
        <Route path="foreman" element={<TradeOSForemanPage />} />
        <Route path="crm" element={<TradeOSCrmPage />} />
        <Route path="workedge" element={<TradeOSWorkEdgePage />} />
        <Route path="ottopay" element={<TradeOSOttoPayPage />} />
        <Route path="social" element={<TradeOSSocialPage />} />
        <Route path="reporting" element={<TradeOSReportingPage />} />
        <Route path="messages" element={<TradeOSMessagesPage />} />
        <Route path="analytics" element={<TradeOSAnalyticsPage />} />
        <Route path="settings" element={<TradeOSSettingsPage />} />
      </Routes>
    </TradeOSLayout>
  );
}
