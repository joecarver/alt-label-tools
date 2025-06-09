import { supabase } from "./supabase";

// Hardcoded list of admin emails
const ADMIN_EMAILS = [
  "joe.crvr1@gmail.com",
  "joecarver@live.co.uk",
  "altlabeltools@gmail.com",
  "djpitchdj@gmail.com",
];

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}

// Checks if a user has access to a client via the client_users table
export async function userHasAccessToClient(
  userId: string,
  clientId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("client_users")
    .select("id")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .single();
  if (error && error.code !== "PGRST116") {
    // PGRST116: No rows found
    console.error("Error checking client access:", error);
    return false;
  }
  return !!data;
}
