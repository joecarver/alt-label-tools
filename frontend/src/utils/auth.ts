import { createClient, type User } from "@supabase/supabase-js";
import { getSecret } from "astro:env/server";

const SUPABASE_URL = getSecret("SUPABASE_URL");
const SUPABASE_ANON_KEY = getSecret("SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase environment variables are not set");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sign up a new user
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

// Sign in an existing user
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// Sign out the current user
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get the user from a session token (access_token)
export async function getUserFromToken(token: string): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    console.error("Error getting user from token", error);
    return null;
  }
  return data.user;
}

// Helper to get auth token from cookies
export function getAuthTokenFromCookies(cookies: any): string | null {
  return cookies.get("auth_token")?.value || null;
}
