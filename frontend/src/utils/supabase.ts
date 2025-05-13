import { createClient } from '@supabase/supabase-js';
import { getSecret } from 'astro:env/server';
import type { LabelClient } from '../types/LabelClient';
import type { Release } from '../types/Release';
import type { ReleaseTask } from '../types/ReleaseTask';
import type { TaskStatus } from '../types/TaskCompletionStatus';
import { CompletionStatus } from '../types/CompletionStatus';
import { DueDateStatus } from '../types/DueDateStatus';
import { BadgeColor } from '../types/BadgeColor';
import type { FileInfo } from '../types/FileInfo';
import { keysToCamelCase } from './case';

// Initialize Supabase client
const supabaseUrl = getSecret('SUPABASE_URL');
const supabaseKey = getSecret('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Fetch all clients
export async function getClients(): Promise<LabelClient[]> {
    const { data, error } = await supabase
        .from('clients')
        .select('*');

    if (error) {
        console.error('Error fetching clients:', error);
        throw error;
    }

    return keysToCamelCase<LabelClient[]>(data);
}

// Fetch releases for a specific client
export async function getReleases(clientId: string): Promise<Release[]> {
    const { data, error } = await supabase
        .from('releases')
        .select('*')
        .eq('client_id', clientId);

    if (error) {
        console.error('Error fetching releases:', error);
        throw error;
    }

    return keysToCamelCase<Release[]>(data);
}

// Fetch tasks for a specific release
export async function getTasks(releaseId: string): Promise<ReleaseTask[]> {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('release_id', releaseId);

    const taskStatuses = await supabase
        .from('task_statuses')
        .select('*')
        .in('task_id', (data || []).map((task) => task.id));

    if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
    }

    const tasks = data.map((task) => ({
        ...task,
        taskStatus: taskStatuses.data?.find((status) => status.task_id === task.id) || null
    }));

    return keysToCamelCase<ReleaseTask[]>(tasks);
}

// Fetch task status
export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
    const { data, error } = await supabase
        .from('task_statuses')
        .select('*')
        .eq('task_id', taskId)
        .single();

    if (error) {
        console.error('Error fetching task status:', error);
        throw error;
    }

    return keysToCamelCase<TaskStatus>(data);
} 