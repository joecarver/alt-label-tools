import type { APIContext } from "astro";
import { getUserFromToken } from "./utils/auth";

export async function onRequest(
  context: APIContext,
  next: () => Promise<Response>
) {
  // Skip auth check for login page and API endpoints
  const url = new URL(context.request.url);
  if (url.pathname === "/login" || url.pathname.startsWith("/api/")) {
    return next();
  }

  // Check for auth token
  const authToken = context.cookies.get("auth_token");
  if (!authToken) {
    context.cookies.delete("auth_token", { path: "/" });
    return context.redirect("/login");
  }

  // Verify token and continue
  try {
    const user = await getUserFromToken(authToken.value);
    if (!user) {
      context.cookies.delete("auth_token", { path: "/" });
      return context.redirect("/login");
    }
    return next();
  } catch (error) {
    console.error("Auth error:", error);
    return context.redirect("/login");
  }
}
