import type { APIRoute } from 'astro';
import { getTaskSummary } from '../../utils/getTaskSummary';
import { ReleaseTaskName } from '../../types/ReleaseTask';
import { getTasks } from '../../utils/supabase';
import type { ReleaseTask } from '../../types/ReleaseTask';

export const GET: APIRoute = async ({ url }) => {
    const releaseId = url.searchParams.get('releaseId');

    if (!releaseId) {
        return new Response(JSON.stringify({ error: 'Missing required releaseId' }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    try {
        const tasks = await getTasks(releaseId);
        const taskSummary = getTaskSummary(tasks);
        const releaseDate = tasks.find((task: ReleaseTask) => task.name === ReleaseTaskName.ReleaseDate)?.startDate || "";

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