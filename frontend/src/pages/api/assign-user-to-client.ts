import type { APIRoute } from "astro";
import { getAuthTokenFromCookies, getUserFromToken } from "../../utils/auth";
import { isAdmin } from "../../utils/authorization";
import { assignUserToClient, removeUserFromClient } from "../../utils/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = getAuthTokenFromCookies(cookies);
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  const user = await getUserFromToken(token);
  if (!user || !user.email || !isAdmin(user.email)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  const { userId, clientId } = await request.json();
  if (!userId || !clientId) {
    return new Response(
      JSON.stringify({ error: "userId and clientId required" }),
      { status: 400 }
    );
  }

  const success = await assignUserToClient(userId, clientId);
  if (!success) {
    return new Response(
      JSON.stringify({ error: "Failed to assign user to client" }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const token = getAuthTokenFromCookies(cookies);
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  const user = await getUserFromToken(token);
  if (!user || !user.email || !isAdmin(user.email)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  const { userId, clientId } = await request.json();
  if (!userId || !clientId) {
    return new Response(
      JSON.stringify({ error: "userId and clientId required" }),
      { status: 400 }
    );
  }

  const success = await removeUserFromClient(userId, clientId);
  if (!success) {
    return new Response(
      JSON.stringify({ error: "Failed to remove user from client" }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
