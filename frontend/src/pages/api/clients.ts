import type { APIRoute } from "astro";
import { getClients } from "@/utils/supabase";

export const GET: APIRoute = async () => {
  try {
    const clients = await getClients();
    return new Response(JSON.stringify(clients), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch clients" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
