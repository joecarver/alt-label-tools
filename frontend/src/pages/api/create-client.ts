import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../supabase/types";

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabase = createClient<Database>(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const data = await request.json();
    const { name, folder_id } = data;

    // Create the client
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        name,
        folder_id,
      })
      .select()
      .single();

    if (clientError) throw clientError;

    return new Response(JSON.stringify({ success: true, client }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error creating client:", error);
    return new Response(JSON.stringify({ error: "Failed to create client" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
