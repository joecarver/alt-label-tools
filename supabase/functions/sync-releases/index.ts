import { supabase, handleError, successResponse, trackSyncExecution } from '../_shared/utils.ts'
import { getReleasesFromNotion } from "../_shared/releases.ts";

export async function serve(req: Request) {
    const startTime = Date.now()
    try {
        console.log('Starting releases sync...')

        const { data: clients } = await supabase.from('clients').select('id, notion_id, name')

        const { data: existingReleases } = await supabase
            .from('releases').select('id, notion_id');

        const existingIds = new Set(existingReleases?.map(r => r.notion_id) ?? [])
        const currentNotionIds = new Set<string>()

        let recordsProcessed = 0;
        let recordsCreated = 0;
        let recordsUpdated = 0;
        let recordsDeleted = 0;

        if (!clients) {
            throw new Error('No clients found')
        }

        for (const client of clients) {
            const releases = await getReleasesFromNotion(client.notion_id, client.name);

            // Track all current Notion IDs
            releases.forEach(release => currentNotionIds.add(release.id))

            const { error } = await supabase
                .from('releases')
                .upsert(
                    releases.map(release => ({
                        notion_id: release.id,
                        name: release.name,
                        catalog_number: release.catalogNumber,
                        artist: release.artist,
                        client_id: client.id,
                        notion_url: release.notionUrl,
                        folder_id: release.folderId,
                    })),
                    { onConflict: 'notion_id' }
                )

            if (error) throw error

            recordsProcessed += releases.length;
            recordsCreated += releases.filter(r => !existingIds.has(r.id)).length;
            recordsUpdated += releases.filter(r => existingIds.has(r.id)).length;
        }

        // Find and delete records that no longer exist in Notion
        const recordsToDelete = Array.from(existingIds).filter(id => !currentNotionIds.has(id))
        if (recordsToDelete.length > 0) {
            const { error } = await supabase
                .from('releases')
                .delete()
                .in('notion_id', recordsToDelete)

            if (error) throw error
            recordsDeleted = recordsToDelete.length
        }

        const result = {
            recordsProcessed,
            recordsCreated,
            recordsUpdated,
            recordsDeleted
        }

        await trackSyncExecution('sync-releases', 'success', result, null, startTime)

        console.log(`Successfully synced ${result.recordsProcessed} releases (${result.recordsCreated} created, ${result.recordsUpdated} updated, ${result.recordsDeleted} deleted)`)
        return successResponse(result)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        await trackSyncExecution('sync-releases', 'failure', {
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0
        }, errorMessage, startTime)
        return handleError(error)
    }
}

Deno.serve(serve)