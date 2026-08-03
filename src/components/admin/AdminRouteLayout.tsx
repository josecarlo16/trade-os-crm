import { Outlet } from 'react-router-dom';
import { AssistantProvider } from './assistant/AssistantContext';
import { AIAssistantPanel } from './assistant/AIAssistantPanel';
import { AssistantToggle } from './assistant/AssistantToggle';
import { useAssistantPermissions } from './assistant/hooks/useAssistantPermissions';
import { useBriefing } from './assistant/hooks/useBriefing';

const AdminRouteContent = () => {
  const { canAccess, canBriefing, canVoice, isLoading: permissionsLoading } = useAssistantPermissions();
  const { badgeCount, briefingData } = useBriefing({ enabled: canAccess && canBriefing });

  return (
    <>
      <Outlet context={{ briefingData, canBriefing }} />
      {!permissionsLoading && canAccess && (
        <>
          <AssistantToggle badgeCount={canBriefing ? badgeCount : 0} />
          <AIAssistantPanel enableVoice={canVoice} briefingData={canBriefing ? briefingData : null} />
        </>
      )}
    </>
  );
};

export const AdminRouteLayout = () => (
  <AssistantProvider>
    <AdminRouteContent />
  </AssistantProvider>
);
