import type { APIContext } from "astro";
import { getUserFromToken } from "./utils/auth";
import { getClients } from "./utils/supabase";
import { isAdmin } from "./utils/authorization";
import type { LabelClient } from "./types/LabelClient";

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

    // Fetch clients and attach to context
    let clients: LabelClient[] = [];
    try {
      clients = await getClients(
        user.email && isAdmin(user.email) ? undefined : user.id
      );
    } catch (error) {
      console.error("Error fetching clients:", error);
      return context.redirect("/login");
    }

    // Attach user and clients to context
    context.locals.user = user;
    context.locals.clients = clients;

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
