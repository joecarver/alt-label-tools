import type { APIRoute } from "astro";
import { supabase as adminSupabase } from "@/utils/supabase";

export const POST: APIRoute = async ({ request }) => {
  const { email, name, clients, isResendInvite } = await request.json();
  if (!email) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    // Invite user via Supabase (send invite email)
    const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${
          process.env.PUBLIC_SITE_URL || "http://localhost:4321"
        }/accept-invite`,
        data: { name },
      }
    );

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = data.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "User creation failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (isResendInvite) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Add client_user rows
    for (const clientId of clients) {
      await adminSupabase
        .from("user_client_permissions")
        .insert({ user_id: userId, client_id: clientId });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to invite user" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
