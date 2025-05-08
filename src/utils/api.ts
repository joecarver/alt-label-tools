import { Client } from '@notionhq/client';
import { getEnv } from './env';

const notion = new Client({
    auth: getEnv('NOTION_API_KEY'),
});

export interface ScheduleItem {
    id: string;
    title: string;
    date: string;
    description: string;
}

export interface WorkflowItem {
    id: string;
    name: string;
    status: string;
    lastRun: string;
}

export async function getScheduleData(): Promise<ScheduleItem[]> {
    try {
        const databaseId = getEnv('NOTION_DATABASE_ID');
        if (!databaseId) {
            throw new Error('NOTION_DATABASE_ID is not set');
        }

        const response = await notion.databases.query({
            database_id: databaseId,
        });

        return response.results.map((page: any) => ({
            id: page.id,
            title: page.properties.Name.title[0]?.plain_text || '',
            date: page.properties.Date.date?.start || '',
            description: page.properties.Description.rich_text[0]?.plain_text || '',
        }));
    } catch (error) {
        console.error('Error fetching schedule data:', error);
        return [];
    }
}

export async function getWorkflowData(): Promise<WorkflowItem[]> {
    try {
        const webhookUrl = getEnv('N8N_WEBHOOK_URL');
        const apiKey = getEnv('N8N_API_KEY');

        if (!webhookUrl || !apiKey) {
            throw new Error('N8N_WEBHOOK_URL or N8N_API_KEY is not set');
        }

        const response = await fetch(webhookUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch workflow data');
        }

        const data = await response.json();
        return data.map((workflow: any) => ({
            id: workflow.id,
            name: workflow.name,
            status: workflow.status,
            lastRun: workflow.lastRun,
        }));
    } catch (error) {
        console.error('Error fetching workflow data:', error);
        return [];
    }
} 