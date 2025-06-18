import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { uploadFile } from "../../utils/drive";
import { getSecret } from "astro:env/server";
import { CompletionStatus } from "@/types/CompletionStatus";
import { DueDateStatus } from "@/types/DueDateStatus";

import { shouldTriggerMp3TaggingForUpload } from "@/utils/shouldTriggerMp3Tagging";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const parentId = formData.get("parentId") as string;
    const taskId = formData.get("taskId") as string;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
      });
    }

    if (!taskId) {
      return new Response(JSON.stringify({ error: "No task ID provided" }), {
        status: 400,
      });
    }

    // Upload file to Google Drive
    const fileId = await uploadFile(file, parentId);

    // Create Supabase client
    const supabase = createClient<Database>(
      getSecret("SUPABASE_URL") || "",
      getSecret("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Create task_files record
    const { data: taskFile, error: taskFileError } = await supabase
      .from("task_files")
      .insert({
        file_id: fileId,
        task_id: taskId,
        name: file.name,
        mime_type: file.type,
        file_created_at: new Date().toISOString(),
        file_updated_at: new Date().toISOString(),
        drive_link: `https://drive.google.com/file/d/${fileId}/view`,
      })
      .select()
      .single();

    if (taskFileError) {
      throw taskFileError;
    }

    // Update task completion only if this is the first file
    const { data: existingFiles } = await supabase
      .from("task_files")
      .select("id")
      .eq("task_id", taskId);

    if (!existingFiles || existingFiles.length === 1) {
      const { error: taskError } = await supabase
        .from("tasks")
        .update({
          completion_status: CompletionStatus.DONE_DETECTED,
          due_date_status: DueDateStatus.UNKNOWN,
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (taskError) {
        throw taskError;
      }
    }

    // Check if we should trigger MP3 tagging
    const taggingResult = await shouldTriggerMp3TaggingForUpload(
      supabase,
      taskId,
      file.name
    );
    if (taggingResult.shouldTrigger) {
      fetch(
        "https://alt-label-tools-mp3tagger.onrender.com/process-single-release",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artworkFolderId: taggingResult.release.artwork_folder_id,
            masterFolderId: taggingResult.release.masters_folder_id,
            releaseName: taggingResult.release.name,
            releaseYear: new Date().getFullYear().toString(),
          }),
        }
      );
    }

    return new Response(JSON.stringify({ fileId, taskFile }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return new Response(JSON.stringify({ error: "Failed to upload file" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
