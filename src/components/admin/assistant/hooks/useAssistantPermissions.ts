import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

const ASSISTANT_PERMISSIONS_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export interface AssistantPermissions {
  canAccess: boolean;
  canWrite: boolean;
  canCalendar: boolean;
  canVoice: boolean;
  canBriefing: boolean;
  canFinancials: boolean;
  maxMessagesPerHour: number;
  isLoading: boolean;
  role: string | null;
}

export function useAssistantPermissions(): AssistantPermissions {
  const { role, loading: roleLoading } = useUserRole();
  const [permissions, setPermissions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPermissions = async () => {
      if (roleLoading) return;

      if (!role) {
        if (!cancelled) {
          setPermissions(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      try {
        const { data, error } = await withTimeout(
          supabase
            .from("assistant_role_permissions" as any)
            .select("*")
            .eq("role_name", role)
            .single(),
          ASSISTANT_PERMISSIONS_TIMEOUT_MS,
          'Assistant permission lookup timed out'
        );

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setPermissions(data);
        }
      } catch (error) {
        console.error('Error fetching assistant permissions:', error);
        if (!cancelled) {
          setPermissions(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchPermissions();

    return () => {
      cancelled = true;
    };
  }, [role, roleLoading]);

  return {
    canAccess: permissions?.can_access_assistant ?? (role === "super_admin" || role === "admin"),
    canWrite: permissions?.can_use_write_tools ?? false,
    canCalendar: permissions?.can_use_calendar_tools ?? false,
    canVoice: permissions?.can_use_voice_input ?? true,
    canBriefing: permissions?.can_view_briefing ?? false,
    canFinancials: permissions?.can_view_financials ?? false,
    maxMessagesPerHour: permissions?.max_messages_per_hour ?? 30,
    isLoading: isLoading || roleLoading,
    role: role as string | null,
  };
}
