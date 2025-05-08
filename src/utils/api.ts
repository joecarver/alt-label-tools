import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({
    auth: import.meta.env.NOTION_API_KEY,
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
        const response = await notion.databases.query({
            database_id: import.meta.env.NOTION_DATABASE_ID!,
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
        const response = await fetch(import.meta.env.N8N_WEBHOOK_URL!, {
            headers: {
                'Authorization': `Bearer ${import.meta.env.N8N_API_KEY}`,
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