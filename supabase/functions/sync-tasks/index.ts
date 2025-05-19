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
        const currentNotionIds = new Set<string>()

        let totalResult = {
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0
        }

        for (const release of releases) {
            const tasks = await getTasksFromNotion(release.notion_id, release.catalog_number);

            // Track all current Notion IDs
            tasks.forEach(task => currentNotionIds.add(task.id))

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
                recordsUpdated: tasks.filter(t => existingIds.has(t.id)).length,
                recordsDeleted: 0
            }

            totalResult = {
                recordsProcessed: totalResult.recordsProcessed + result.recordsProcessed,
                recordsCreated: totalResult.recordsCreated + result.recordsCreated,
                recordsUpdated: totalResult.recordsUpdated + result.recordsUpdated,
                recordsDeleted: totalResult.recordsDeleted
            }

            console.log(`Successfully synced ${result.recordsProcessed} tasks`)
        }

        // Find and delete tasks that no longer exist in Notion
        const recordsToDelete = Array.from(existingIds).filter(id => !currentNotionIds.has(id))
        if (recordsToDelete.length > 0) {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .in('notion_id', recordsToDelete)

            if (error) throw error
            totalResult.recordsDeleted = recordsToDelete.length
        }

        await trackSyncExecution('sync-tasks', 'success', totalResult, null, startTime)
        console.log(`Successfully synced ${totalResult.recordsProcessed} tasks (${totalResult.recordsCreated} created, ${totalResult.recordsUpdated} updated, ${totalResult.recordsDeleted} deleted)`)
        return successResponse(totalResult)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        await trackSyncExecution('sync-tasks', 'failure', {
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0
        }, errorMessage, startTime)
        return handleError(error)
    }
}

Deno.serve(serve)