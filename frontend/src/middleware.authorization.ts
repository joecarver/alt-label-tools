import type { APIContext } from "astro";
import { getUserFromToken } from "./utils/auth";
import { isAdmin, userHasAccessToClient } from "./utils/authorization";

// Extend Locals type for isAdmin and user
interface AuthLocals {
  isAdmin: boolean;
  user: any;
}

export async function onRequest(
  context: APIContext,
  next: () => Promise<Response>
) {
  // Get auth token and user
  const authToken = context.cookies.get("auth_token");
  if (!authToken) {
    context.cookies.delete("auth_token", { path: "/" });
    return context.redirect("/login");
  }
  const user = await getUserFromToken(authToken.value);
  if (!user) {
    context.cookies.delete("auth_token", { path: "/" });
    return context.redirect("/login");
  }

  // Check admin
  const admin = isAdmin(user.email);
  (context.locals as AuthLocals).isAdmin = admin;
  (context.locals as AuthLocals).user = user;

  // If admin, allow
  if (admin) {
    return next();
  }

  // Get clientId from query or params (adjust as needed for your routes)
  const url = new URL(context.request.url);
  let clientId = url.searchParams.get("clientId");
  if (!clientId && context.params && context.params.clientId) {
    clientId = context.params.clientId;
  }
  if (!clientId || typeof clientId !== "string") {
    return new Response("Client ID required", { status: 400 });
  }

  // Check access
  const hasAccess = await userHasAccessToClient(user.id, clientId);
  if (!hasAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  return next();
}
