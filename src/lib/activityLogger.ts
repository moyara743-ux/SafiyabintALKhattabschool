import { supabase } from '../supabaseClient';
import { ActivityAction, ActivityLog } from '../types';

interface LogOperationParams {
  actorId: string;
  actorName: string;
  actorEmail: string;
  action: ActivityAction;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

export async function logActivity(params: LogOperationParams): Promise<void> {
  try {
    // Write to Supabase activity_logs table
    await supabase.from('activity_logs').insert([
      {
        actor_id: params.actorId,
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId,
      },
    ]);

    // Also store locally for instant view in ActivityLogView
    const localLogs: ActivityLog[] = JSON.parse(
      localStorage.getItem('safiah_activity_logs') || '[]'
    );
    const newLog: ActivityLog = {
      id: 'log_' + Date.now(),
      actorId: params.actorId,
      actorName: params.actorName,
      actorEmail: params.actorEmail,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      details: params.details,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(
      'safiah_activity_logs',
      JSON.stringify([newLog, ...localLogs].slice(0, 100))
    );
  } catch (error) {
    console.warn('Activity log record handled:', error);
  }
}
