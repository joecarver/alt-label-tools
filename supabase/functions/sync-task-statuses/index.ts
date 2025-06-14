import { supabase, handleError, successResponse } from "../_shared/utils.ts";
import { getTaskCompletionStatus } from "../_shared/taskStatus.ts";
import { ReleaseTaskName } from "@/types/ReleaseTask.ts";
import type { TaskFile } from "../../../types/TaskFile.ts";
import type { ReleaseTask } from "../../../types/ReleaseTask.ts";

export async function serve(req: Request) {
  try {
    console.log("Starting task status updates...");

    // Get all tasks that need status updates
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(
        `
        id,
        name,
        end_date,
        completed_at,
        is_detectable,
        completion_status,
        due_date_status,
        releases (
          folder_id,
          premasters_folder_id,
          masters_folder_id,
          artwork_folder_id,
          documentation_folder_id
        )
      `
      )
      .order("updated_at", { ascending: false })
      .eq("is_detectable", true)
      .limit(100); // Process in batches to avoid timeouts

    if (tasksError) throw tasksError;

    const statusUpdates = await Promise.all(
      tasks.map(async (task) => {
        const folderId = getFolderIdForTask(task);
        const permittedMimeTypes = getPermittedMimeTypesForTask(task);

        const status = await getTaskCompletionStatus({
          folderId,
          permittedMimeTypes,
          dueDate: task.end_date ?? undefined,
        });

        return {
          ...status,
          ...task,
        };
      })
    );

    const updateErrors = await Promise.all(
      statusUpdates
        .filter(
          (status) =>
            status.completionStatus !== status.completion_status ||
            status.dueDateStatus !== status.due_date_status
        )
        .map((task) =>
          supabase
            .from("tasks")
            .update({
              completion_status: task.completionStatus,
              due_date_status: task.dueDateStatus,
            })
            .eq("id", task.id)
        )
    );

    if (updateErrors.some((error) => error.error)) {
      throw updateErrors.find((error) => error.error);
    }

    const filesToUpdate = statusUpdates.flatMap((status) =>
      status.files.map((file: TaskFile) => ({
        task_id: status.id,
        name: file.name,
        drive_link: file.webViewLink,
        file_created_at: file.createdTime,
        file_updated_at: file.updatedTime,
        file_id: file.id,
        mime_type: file.mimeType,
      }))
    );

    const { error: fileUpdateError } = await supabase
      .from("task_files")
      .upsert(filesToUpdate, { onConflict: "file_id" });

    if (fileUpdateError) {
      throw fileUpdateError;
    }

    const result = {
      recordsProcessed: statusUpdates.length,
    };

    console.log(
      `Successfully updated ${result.recordsProcessed} task statuses`
    );
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

function getFolderIdForTask(task: ReleaseTask): string | null {
  const release = Array.isArray(task.releases)
    ? task.releases[0]
    : task.releases;

  switch (task.name) {
    case ReleaseTaskName.ContractCreated:
      return release.documentation_folder_id ?? null;
    case ReleaseTaskName.PreMastersSubmitted:
      return release.premasters_folder_id ?? null;
    case ReleaseTaskName.MastersSubmitted:
      return release.masters_folder_id ?? null;
    case ReleaseTaskName.ArtworkCreation:
      return release.artwork_folder_id ?? null;
    default:
      return null;
  }
}

function getPermittedMimeTypesForTask(task: ReleaseTask): string[] {
  switch (task.name) {
    case ReleaseTaskName.ContractCreated:
      return ["application/pdf"];
    case ReleaseTaskName.PreMastersSubmitted:
      return ["audio/wav", "audio/flac", "audio/aiff"];
    case ReleaseTaskName.MastersSubmitted:
      return ["audio/wav", "audio/flac", "audio/aiff"];
    case ReleaseTaskName.ArtworkCreation:
      return ["image/jpeg", "image/png", "image/tiff"];
    default:
      return [];
  }
}

Deno.serve(serve);
