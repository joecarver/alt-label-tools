// supabase/functions/monitor-sync-health/index.ts
import { supabase, handleError, successResponse } from '../_shared/utils.ts'
/// <reference lib="deno.ns" />

Deno.serve(async (req) => {
    try {
        console.log('Starting sync health check...')

        // Update the monitoring data
        const { error: updateError } = await supabase.rpc('update_sync_health')
        if (updateError) throw updateError

        // Check for unhealthy syncs
        const { data: unhealthySyncs, error: checkError } = await supabase.rpc('check_sync_health')
        if (checkError) throw checkError

        // If there are unhealthy syncs, trigger the alert function
        if (unhealthySyncs && unhealthySyncs.length > 0) {
            const { error: alertError } = await supabase.rpc('alert_on_sync_failure')
            if (alertError) throw alertError
        }

        return successResponse({
            unhealthySyncs: unhealthySyncs || [],
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        return handleError(error)
    }
})