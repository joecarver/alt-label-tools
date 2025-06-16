import type { APIRoute } from "astro";
import { supabase } from "@/utils/supabase";

export const POST: APIRoute = async ({ request }) => {
  const { email } = await request.json();
  if (!email) {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${
      process.env.PUBLIC_SITE_URL || "http://localhost:4321"
    }/reset-password`,
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
