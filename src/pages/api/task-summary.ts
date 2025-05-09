import type { APIRoute } from 'astro';
import { getTaskSummary } from '@/utils/getTaskSummary';
import { ReleaseTaskName } from '@/types/ReleaseTask';
import { getTasks } from '@/utils/NotionApi/tasks';

export const GET: APIRoute = async ({ url }) => {
    const releaseId = url.searchParams.get('releaseId');
    const clientName = url.searchParams.get('clientName');
    const catalogNumber = url.searchParams.get('catalogNumber');

    if (!releaseId || !clientName || !catalogNumber) {
        return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    try {
        const taskIds = url.searchParams.get('taskIds')?.split(';') || [];
        const tasks = await getTasks(releaseId, taskIds, clientName, catalogNumber);
        const taskSummary = getTaskSummary(tasks);
        const releaseDate = tasks.find((task) => task.name === ReleaseTaskName.ReleaseDate)?.startDate || "";

        return new Response(JSON.stringify({
            completedTasks: taskSummary.completedTasks,
            totalTasks: taskSummary.totalTasks,
            color: taskSummary.color,
            releaseDate: releaseDate,
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error fetching task summary:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch task summary' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}; 