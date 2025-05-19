import "https://deno.land/std@0.204.0/dotenv/load.ts";
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

export function handleError(error: unknown) {
    return new Response(
        JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            timestamp: new Date().toISOString()
        }),
        {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }
    )
}

export function successResponse(data: unknown) {
    return new Response(
        JSON.stringify({
            success: true,
            data,
            timestamp: new Date().toISOString()
        }),
        {
            headers: { 'Content-Type': 'application/json' }
        }
    )
}

export interface SyncExecutionResult {
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsDeleted?: number;
}

export async function trackSyncExecution(
    functionName: string,
    status: 'success' | 'failure',
    result: SyncExecutionResult,
    errorMessage: string | null = null,
    startTime: number
) {
    await supabase
        .from('sync_executions')
        .insert({
            function_name: functionName,
            status,
            completed_at: new Date().toISOString(),
            records_processed: result.recordsProcessed,
            records_created: result.recordsCreated,
            records_updated: result.recordsUpdated,
            records_deleted: result.recordsDeleted,
            error_message: errorMessage,
            execution_time_ms: Date.now() - startTime
        })
}