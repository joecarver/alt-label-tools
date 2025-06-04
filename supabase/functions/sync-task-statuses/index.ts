import { supabase, handleError, successResponse } from "../_shared/utils.ts";
import { getTaskStatus } from "../_shared/taskStatus.ts";

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
        releases (
          folder_id
        )
      `
      )
      .order("updated_at", { ascending: false })
      .limit(100); // Process in batches to avoid timeouts

    if (tasksError) throw tasksError;

    // Get existing statuses to determine created vs updated
    const { data: existingStatuses } = await supabase
      .from("task_statuses")
      .select("task_id");

    const existingIds = new Set(existingStatuses?.map((s) => s.task_id) ?? []);

    const statusUpdates = await Promise.all(
      tasks.map(async (task) => {
        const release = Array.isArray(task.releases)
          ? task.releases[0]
          : task.releases;
        const status = await getTaskStatus(
          task.id,
          task.name,
          release.folder_id,
          task.completed_at,
          task.is_detectable,
          task.end_date
        );
        return { ...status, taskId: task.id };
      })
    );

    const { error: updateError } = await supabase.from("task_statuses").upsert(
      statusUpdates.map((status) => ({
        task_id: status.taskId,
        completion_status: status.completionStatus,
        due_date_status: status.dueDateStatus,
        color: status.color,
        file_info: status.fileInfo,
      })),
      { onConflict: "task_id" }
    );

    if (updateError) throw updateError;

    const result = {
      recordsProcessed: statusUpdates.length,
      recordsCreated: statusUpdates.filter((s) => !existingIds.has(s.taskId))
        .length,
      recordsUpdated: statusUpdates.filter((s) => existingIds.has(s.taskId))
        .length,
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
