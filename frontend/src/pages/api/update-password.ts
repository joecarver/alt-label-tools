import type { APIRoute } from "astro";
import { getUserFromToken } from "@/utils/auth";
import { supabase } from "@/utils/supabase";
import { getSecret } from "astro:env/server";

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

  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password,
  });

  if (signInError) {
    return new Response(JSON.stringify({ error: signInError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const access_token = data.session?.access_token;
  if (!access_token) {
    return new Response(JSON.stringify({ error: "No access token received" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  cookies.set("auth_token", access_token, {
    path: "/",
    httpOnly: true,
    secure: getSecret("NODE_ENV") === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: "lax",
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
