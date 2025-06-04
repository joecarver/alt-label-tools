import type { APIRoute } from "astro";
import { getAuthTokenFromCookies, getUserFromToken } from "../../utils/auth";
import { isAdmin } from "../../utils/authorization";
import { supabase } from "../../utils/supabase";

export const GET: APIRoute = async ({ cookies }) => {
  const token = getAuthTokenFromCookies(cookies);
  if (!token) {
    return new Response(JSON.stringify([]), { status: 401 });
  }
  const user = await getUserFromToken(token);
  if (!user || !user.email || !isAdmin(user.email)) {
    return new Response(JSON.stringify([]), { status: 403 });
  }
  const { data, error } = await supabase.from("users").select("id, email");
  if (error) {
    return new Response(JSON.stringify([]), { status: 500 });
  }
  return new Response(JSON.stringify(data), { status: 200 });
};
