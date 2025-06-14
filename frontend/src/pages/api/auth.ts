import type { APIRoute } from "astro";
import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getUserFromToken,
  getAuthTokenFromCookies,
} from "@/utils/auth";
import { getSecret } from "astro:env/server";

// POST /api/auth - login or signup
export const POST: APIRoute = async ({ request, cookies }) => {
  const { email, password, type } = await request.json();

  try {
    let data;
    if (type === "signup") {
      data = await signUpWithEmail(email, password);
    } else {
      data = await signInWithEmail(email, password);
    }

    const access_token = data.session?.access_token;
    if (!access_token) {
      return new Response(
        JSON.stringify({ error: "No access token received" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Set the token in an HTTP-only cookie
    cookies.set("auth_token", access_token, {
      path: "/",
      httpOnly: true,
      secure: getSecret("NODE_ENV") === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return new Response(JSON.stringify({ user: data.user }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// GET /api/auth - get current user
export const GET: APIRoute = async ({ cookies }) => {
  const token = getAuthTokenFromCookies(cookies);
  if (!token) {
    return new Response(JSON.stringify({ error: "No token found" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// DELETE /api/auth - sign out
export const DELETE: APIRoute = async ({ cookies }) => {
  try {
    await signOut();
    cookies.delete("auth_token", { path: "/" });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
