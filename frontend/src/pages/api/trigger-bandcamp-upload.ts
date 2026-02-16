import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getSecret } from "astro:env/server";

const BANDCAMP_UPLOADER_URL =
  getSecret("BANDCAMP_UPLOADER_URL") || "http://localhost:8000";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { releaseId, taskId } = body;

    if (!releaseId || !taskId) {
      return new Response(
        JSON.stringify({ error: "Missing releaseId or taskId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient<Database>(
      getSecret("SUPABASE_URL") || "",
      getSecret("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Fetch the release name for the response message
    const { data: release, error: releaseError } = await supabase
      .from("releases")
      .select("id, name")
      .eq("id", releaseId)
      .single();

    if (releaseError || !release) {
      return new Response(
        JSON.stringify({ error: "Release not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fire-and-forget call to the Python Bandcamp uploader service
    // Credentials are configured on the uploader service via env vars
    fetch(`${BANDCAMP_UPLOADER_URL}/upload-to-bandcamp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        release_id: releaseId,
        task_id: taskId,
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Bandcamp upload triggered for "${release.name}"`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error triggering Bandcamp upload:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to trigger Bandcamp upload",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
