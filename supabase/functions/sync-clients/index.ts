import { supabase, handleError, successResponse, trackSyncExecution } from '../_shared/utils.ts'
import { getClientsFromNotion } from "../_shared/clients.ts";

export async function serve(req: Request) {
    const startTime = Date.now()
    try {
        console.log('Starting clients sync...')
        console.log('Supabase client available:', !!supabase)

        console.log('Fetching clients from Notion...')
        const clients = await getClientsFromNotion();
        console.log('Retrieved clients from Notion:', clients.length)

        // Get existing clients to determine created vs updated
        console.log('Fetching existing clients from Supabase...')
        const { data: existingClients, error: fetchError } = await supabase
            .from('clients')
            .select('notion_id')
        
        if (fetchError) {
            console.error('Error fetching existing clients:', fetchError)
            throw fetchError
        }
        console.log('Retrieved existing clients:', existingClients?.length ?? 0)

        const existingIds = new Set(existingClients?.map(c => c.notion_id) ?? [])

        console.log('Upserting clients to Supabase...')
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

        if (error) {
            console.error('Error upserting clients:', error)
            throw error
        }

        const result = {
            recordsProcessed: clients.length,
            recordsCreated: clients.filter(c => !existingIds.has(c.id)).length,
            recordsUpdated: clients.filter(c => existingIds.has(c.id)).length
        }

        console.log('Sync results:', result)

        await trackSyncExecution('sync-clients', 'success', result, null, startTime)

        console.log(`Successfully synced ${result.recordsProcessed} clients`)
        return successResponse(result)
    } catch (error) {
        console.error('Detailed error in sync-clients:', error)
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