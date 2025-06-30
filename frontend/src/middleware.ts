import type { APIContext } from "astro";
import { getUserFromToken } from "./utils/auth";
import { getClients, getReleasesForUser } from "./utils/supabase";
import type { LabelClient } from "@/types/LabelClient";
import { isAdmin } from "./utils/authorization";
import type { Release } from "@/types/Release";

export async function onRequest(
  context: APIContext,
  next: () => Promise<Response>
) {
  // Skip auth check for login page and API endpoints
  const url = new URL(context.request.url);
  if (
    url.pathname === "/login" ||
    url.pathname === "/api/auth" ||
    url.pathname === "/reset-password" ||
    url.pathname === "/accept-invite"
  ) {
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

    const userIsAdmin = (user.email && isAdmin(user.email)) || false;

    // Fetch clients and attach to context
    let clients: LabelClient[] = [];
    try {
      clients = await getClients(userIsAdmin ? undefined : user.id);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }

    let releases: Release[] = [];
    try {
      releases = await getReleasesForUser(user.id);
    } catch (error) {
      console.error("Error fetching releases for user:", error);
    }

    // Attach user and clients to context
    context.locals.user = user;
    context.locals.isAdmin = userIsAdmin;
    context.locals.clients = clients;
    context.locals.releases = releases;

    // Only redirect to single client on the main clients page
    if (url.pathname === "/" && clients.length === 1) {
      return context.redirect(`/client/${clients[0].id}`);
    }

    return next();
  } catch (error) {
    console.error("Auth error:", error);
    return context.redirect("/login");
  }
}
