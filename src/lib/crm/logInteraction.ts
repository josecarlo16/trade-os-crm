import { supabase } from '@/integrations/supabase/client';

export interface LogInteractionParams {
  customerId: string;
  type: string;
  subject: string;
  content?: string;
  outcome?: string;
}

/**
 * Logs a system-generated interaction to crm_interactions.
 * Used for automatic event tracking (conversions, pipeline moves, etc.)
 * System events have direction = null to distinguish from manual logs.
 */
export async function logSystemInteraction({
  customerId,
  type,
  subject,
  content,
  outcome,
}: LogInteractionParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('crm_interactions')
      .insert({
        customer_id: customerId,
        interaction_type: type,
        direction: null, // System events have no direction
        subject,
        content: content || null,
        outcome: outcome || null,
      });

    if (error) {
      console.error('Failed to log system interaction:', error);
    }
  } catch (err) {
    console.error('Error logging system interaction:', err);
  }
}

// Predefined system event types
export const SYSTEM_EVENTS = {
  CONVERSION: 'system_conversion',
  PIPELINE_ADD: 'system_pipeline_add',
  PIPELINE_MOVE: 'system_pipeline_move',
  STATUS_CHANGE: 'system_status_change',
} as const;
