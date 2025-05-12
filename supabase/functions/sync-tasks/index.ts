import { supabase, handleError, successResponse, trackSyncExecution } from '../_shared/utils.ts'

import { getTasksFromNotion } from "../_shared/tasks.ts";

export async function serve(req: Request) {
    const startTime = Date.now()
    try {
        console.log('Starting tasks sync...')

        // First get all releases to map their IDs
        const { data: releases, error: releasesError } = await supabase
            .from('releases')
            .select('id, notion_id, catalog_number')

        if (releasesError) throw releasesError

        const { data: existingTasks } = await supabase
            .from('tasks')
            .select('id, notion_id');

        const existingIds = new Set(existingTasks?.map(t => t.notion_id) ?? [])

        let totalResult = {
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0
        }

        for (const release of releases) {
            const tasks = await getTasksFromNotion(release.notion_id, release.catalog_number);

            const { error } = await supabase
                .from('tasks')
                .upsert(
                    tasks.map(task => ({
                        notion_id: task.id,
                        name: task.name,
                        release_id: release.id,
                        start_date: task.startDate,
                        end_date: task.endDate,
                        completed_at: task.completedAt,
                        is_detectable: task.isDetectable,
                    })),
                    { onConflict: 'notion_id' }
                )

            if (error) throw error

            const result = {
                recordsProcessed: tasks.length,
                recordsCreated: tasks.filter(t => !existingIds.has(t.id)).length,
                recordsUpdated: tasks.filter(t => existingIds.has(t.id)).length
            }

            totalResult = {
                recordsProcessed: totalResult.recordsProcessed + result.recordsProcessed,
                recordsCreated: totalResult.recordsCreated + result.recordsCreated,
                recordsUpdated: totalResult.recordsUpdated + result.recordsUpdated
            }

            console.log(`Successfully synced ${result.recordsProcessed} tasks`)
        }

        await trackSyncExecution('sync-tasks', 'success', totalResult, null, startTime)
        return successResponse(totalResult)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        await trackSyncExecution('sync-tasks', 'failure', {
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0
        }, errorMessage, startTime)
        return handleError(error)
    }
}

Deno.serve(serve)