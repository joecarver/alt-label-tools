import type { APIRoute } from "astro";
import { getAuthTokenFromCookies, getUserFromToken } from "@/utils/auth";
import { supabase } from "@/utils/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  const { password, token } = await request.json();
  if (!password) {
    return new Response(JSON.stringify({ error: "Password is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!token) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const user = await getUserFromToken(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid user" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  // Update password using Supabase admin API
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
