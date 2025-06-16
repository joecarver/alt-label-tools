import { createClient } from "@supabase/supabase-js";
import { getSecret } from "astro:env/server";
import type { LabelClient } from "@/types/LabelClient";
import type { Release } from "@/types/Release";
import type { ReleaseTask } from "@/types/ReleaseTask";
import { CompletionStatus } from "@/types/CompletionStatus";
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
    const { data, error } = await supabase
      .from("clients")
      .select(
        "*, releases(*, mastering_engineer(*), designer(*), artists(*), client:clients(*))"
      );

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
export async function getReleases(clientIds: string[]): Promise<Release[]> {
  const { data, error } = await supabase
    .from("releases")
    .select(
      "*, artists(*), mastering_engineer(*), designer(*), client:clients(*)"
    )
    .in("client_id", clientIds);

  if (error) {
    console.error("Error fetching releases:", error);
    throw error;
  }

  return keysToCamelCase<Release[]>(data);
}

export async function getReleasesForUser(userId: string): Promise<Release[]> {
  const { data, error } = await supabase
    .from("user_release_permissions")
    .select(
      "release:releases(*, client:clients(*), mastering_engineer(*), designer(*), artists(*))"
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching releases for user:", error);
    throw error;
  }

  const releases = keysToCamelCase<Release[]>(data.map((row) => row.release));

  return releases;
}

// Fetch tasks for a specific release
export async function getTasks(releaseId: string): Promise<ReleaseTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, task_files(*)")
    .eq("release_id", releaseId);

  if (error) {
    console.error("Error fetching tasks:", error);
    throw error;
  }

  return keysToCamelCase<ReleaseTask[]>(data);
}

// Update task completion status
export async function updateTaskCompletion(
  taskId: string,
  completedAt: string
): Promise<void> {
  const { error: taskError } = await supabase
    .from("tasks")
    .update({
      completed_at: completedAt || null,
      completion_status: completedAt
        ? CompletionStatus.DONE_MANUALLY
        : CompletionStatus.TODO,
    })
    .eq("id", taskId);

  if (taskError) {
    console.error("Error updating task completion:", taskError);
    throw taskError;
  }
}

// Fetch all clients a user has access to
export async function getClientsForUser(
  userId: string
): Promise<LabelClient[]> {
  const { data, error } = await supabase
    .from("user_client_permissions")
    .select(
      "client:clients(*, releases(*, mastering_engineer(*), designer(*), artists(*)))"
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user clients:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  return keysToCamelCase<LabelClient[]>(data.map((row) => row.client));
}

// Assign a user to a client (admin only)
export async function assignUserToClient(
  userId: string,
  clientId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("user_client_permissions")
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
    .from("user_client_permissions")
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
    .from("user_client_permissions")
    .delete()
    .eq("user_id", userId)
    .eq("client_id", clientId);
  if (error) {
    console.error("Error removing user from client:", error);
    return false;
  }
  return true;
}

export async function setReleasePreamastersEmailsSent(
  releaseId: string,
  premastersEmailsSent: boolean
) {
  const { error } = await supabase
    .from("releases")
    .update({ premaster_emails_sent: premastersEmailsSent })
    .eq("id", releaseId);

  if (error) {
    console.error("Error setting release pre-masters emails sent:", error);
    throw error;
  }
}

// Helper to get or create a user by email
export async function getOrCreateUser(email: string) {
  let { data: userList, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    throw listError;
  }
  let user = userList?.users.find((u: any) => u.email === email);
  if (!user) {
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
      });
    if (createError) {
      throw createError;
    }

    user = created.user;
  }
  return user;
}
