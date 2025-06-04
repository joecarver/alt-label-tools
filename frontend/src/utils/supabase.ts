import { createClient } from "@supabase/supabase-js";
import { getSecret } from "astro:env/server";
import type { LabelClient } from "../types/LabelClient";
import type { Release } from "../types/Release";
import type { ReleaseTask } from "../types/ReleaseTask";
import type { TaskStatus } from "../types/TaskCompletionStatus";
import { CompletionStatus } from "../types/CompletionStatus";
import { keysToCamelCase } from "./case";

// Initialize Supabase client
const supabaseUrl = getSecret("SUPABASE_URL");
const supabaseKey = getSecret("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Fetch all clients
export async function getClients(userId?: string): Promise<LabelClient[]> {
  // If no userId provided, return all clients (for admin)
  if (!userId) {
    const { data, error } = await supabase.from("clients").select("*");

    if (error) {
      console.error("Error fetching clients:", error);
      throw error;
    }

    return keysToCamelCase<LabelClient[]>(data);
  }

  // For non-admin users, get only their assigned clients
  return getClientsForUser(userId);
}

// Fetch releases for a specific client
export async function getReleases(clientId: string): Promise<Release[]> {
  const { data, error } = await supabase
    .from("releases")
    .select("*")
    .eq("client_id", clientId);

  if (error) {
    console.error("Error fetching releases:", error);
    throw error;
  }

  return keysToCamelCase<Release[]>(data);
}

// Fetch tasks for a specific release
export async function getTasks(releaseId: string): Promise<ReleaseTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("release_id", releaseId);

  const taskStatuses = await supabase
    .from("task_statuses")
    .select("*")
    .in(
      "task_id",
      (data || []).map((task) => task.id)
    );

  if (error) {
    console.error("Error fetching tasks:", error);
    throw error;
  }

  const tasks = data.map((task) => ({
    ...task,
    taskStatus:
      taskStatuses.data?.find((status) => status.task_id === task.id) || null,
  }));

  return keysToCamelCase<ReleaseTask[]>(tasks);
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const { data, error } = await supabase
    .from("task_statuses")
    .select("*")
    .eq("task_id", taskId)
    .single();

  if (error) {
    console.error("Error fetching task status:", error);
    throw error;
  }

  return keysToCamelCase<TaskStatus>(data);
}

// Update task completion status
export async function updateTaskCompletion(
  taskId: string,
  completedAt: string
): Promise<void> {
  const { error: taskError } = await supabase
    .from("tasks")
    .update({ completed_at: completedAt || null })
    .eq("id", taskId);

  if (taskError) {
    console.error("Error updating task completion:", taskError);
    throw taskError;
  }

  const { error: statusError } = await supabase
    .from("task_statuses")
    .update({
      completion_status: completedAt
        ? CompletionStatus.DONE_MANUALLY
        : CompletionStatus.TODO,
      updated_at: new Date().toISOString(),
    })
    .eq("task_id", taskId);

  if (statusError) {
    console.error("Error updating task status:", statusError);
    throw statusError;
  }
}

// Fetch all clients a user has access to
export async function getClientsForUser(
  userId: string
): Promise<LabelClient[]> {
  const { data, error } = await supabase
    .from("client_users")
    .select("client:clients(*)")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user clients:", error);
    throw error;
  }

  // Flatten the result to just the client objects
  const clients = (data || []).map((row: any) => row.client).filter(Boolean);
  return clients;
}

// Assign a user to a client (admin only)
export async function assignUserToClient(
  userId: string,
  clientId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("client_users")
    .insert([{ user_id: userId, client_id: clientId }]);
  if (error) {
    console.error("Error assigning user to client:", error);
    return false;
  }
  return true;
}

// Get all users with access to a client
export async function getUsersForClient(
  clientId: string
): Promise<{ user_id: string; email: string }[]> {
  const { data, error } = await supabase
    .from("client_users")
    .select("user_id")
    .eq("client_id", clientId);

  if (error) {
    console.error("Error fetching users for client:", error);
    return [];
  }

  const users = await Promise.all(
    data.map(async (u) => {
      const { data: user, error: userError } =
        await supabase.auth.admin.getUserById(u.user_id);
      if (userError) {
        console.error("Error fetching user:", userError);
        return null;
      }
      return {
        user_id: user.user.id,
        email: user.user.email,
      };
    })
  );

  return users.filter((u) => u !== null) as {
    user_id: string;
    email: string;
  }[];
}

// Remove a user from a client
export async function removeUserFromClient(
  userId: string,
  clientId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("client_users")
    .delete()
    .eq("user_id", userId)
    .eq("client_id", clientId);
  if (error) {
    console.error("Error removing user from client:", error);
    return false;
  }
  return true;
}
