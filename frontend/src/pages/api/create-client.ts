import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { createDriveFolder } from "@/utils/drive";
import { getSecret } from "astro:env/server";

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabase = createClient<Database>(
      getSecret("SUPABASE_URL") || "",
      getSecret("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const data = await request.json();
    const { name } = data;

    // Create a Google Drive folder for the client
    const folder_id = await createDriveFolder(name);

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
