import { supabase, handleError, successResponse } from "../_shared/utils.ts";
import { getTaskStatus } from "../_shared/taskStatus.ts";
import { ReleaseTaskName } from "@/types/ReleaseTask.ts";
import type { TaskFile } from "../../../types/TaskFile.ts";

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
          folder_id
        )
      `
      )
      .order("updated_at", { ascending: false })
      .eq("is_detectable", true)
      .limit(100); // Process in batches to avoid timeouts

    if (tasksError) throw tasksError;

    const statusUpdates = await Promise.all(
      tasks.map(async (task) => {
        const release = Array.isArray(task.releases)
          ? task.releases[0]
          : task.releases;

        const status = await getTaskStatus(
          task.id,
          task.name as ReleaseTaskName,
          release.folder_id,
          task.completed_at,
          task.is_detectable ?? false,
          task.end_date
        );

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

Deno.serve(serve);
