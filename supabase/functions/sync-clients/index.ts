
import { supabase, handleError, successResponse, trackSyncExecution } from '../_shared/utils.ts'
import { getClientsFromNotion } from "../_shared/clients.ts";


export async function serve(req: Request) {
    const startTime = Date.now()
    try {
        console.log('Starting clients sync...')

        const clients = await getClientsFromNotion();
        // Get existing clients to determine created vs updated
        const { data: existingClients } = await supabase
            .from('clients')
            .select('notion_id')

        const existingIds = new Set(existingClients?.map(c => c.notion_id) ?? [])

        const { error } = await supabase
            .from('clients')
            .upsert(
                clients.map(client => ({
                    notion_id: client.id,
                    name: client.name,
                    folder_id: client.folderId,
                })),
                { onConflict: 'notion_id' }
            )

        if (error) throw error

        const result = {
            recordsProcessed: clients.length,
            recordsCreated: clients.filter(c => !existingIds.has(c.id)).length,
            recordsUpdated: clients.filter(c => existingIds.has(c.id)).length
        }

        await trackSyncExecution('sync-clients', 'success', result, null, startTime)

        console.log(`Successfully synced ${result.recordsProcessed} clients`)
        return successResponse(result)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        await trackSyncExecution('sync-clients', 'failure', {
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0
        }, errorMessage, startTime)
        return handleError(error)
    }
}

Deno.serve(serve)