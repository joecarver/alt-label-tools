import "https://deno.land/std@0.204.0/dotenv/load.ts";
import { createClient } from '@supabase/supabase-js'
import { Client } from '@notionhq/client'

// Debug environment variables
console.log('Environment variables check:')
console.log('SUPABASE_URL exists:', !!Deno.env.get('SUPABASE_URL'))
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
console.log('NOTION_API_KEY exists:', !!Deno.env.get('NOTION_API_KEY'))

export const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

console.log('Supabase client initialized:', !!supabase)

export const notion = new Client({
    auth: Deno.env.get('NOTION_API_KEY'),
})

console.log('Notion client initialized:', !!notion)

export function handleError(error: unknown) {
    console.error('Error:', error)
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
            error_message: errorMessage,
            execution_time_ms: Date.now() - startTime
        })
}