import type { APIRoute } from "astro";
import { getAuthTokenFromCookies, getUserFromToken } from "@/utils/auth";
import { getFreshClient } from "@/utils/supabase";
import { deleteFile } from "@/utils/drive";
import { CompletionStatus } from "@/types/CompletionStatus";
import { DueDateStatus } from "@/types/DueDateStatus";
import { ReleaseTaskName } from "@/types/ReleaseTask";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  // Check authentication
  const token = getAuthTokenFromCookies(cookies);
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const user = await getUserFromToken(token);
  if (!user || !user.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // Check admin permissions
  if (!locals.isAdmin) {
    return new Response(
      JSON.stringify({ error: "Forbidden - Admin access required" }),
      {
        status: 403,
      }
    );
  }

  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return new Response(JSON.stringify({ error: "taskId is required" }), {
        status: 400,
      });
    }

    const supabase = getFreshClient();

    // Get task details and associated files
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*, task_files(*)")
      .eq("id", taskId)
      .single();

    if (taskError) {
      console.error("Error fetching task:", taskError);
      return new Response(JSON.stringify({ error: "Failed to fetch task" }), {
        status: 500,
      });
    }

    if (!task) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
      });
    }

    // Delete files from Google Drive
    if (task.task_files && task.task_files.length > 0) {
      const deletePromises = task.task_files.map(async (file: any) => {
        try {
          await deleteFile(file.file_id);
          console.log(`Deleted file from Google Drive: ${file.file_id}`);
        } catch (error) {
          console.error(
            `Failed to delete file ${file.file_id} from Google Drive:`,
            error
          );
          // Continue with other files even if one fails
        }
      });

      await Promise.all(deletePromises);
    }

    // Delete task_files records
    const { error: deleteFilesError } = await supabase
      .from("task_files")
      .delete()
      .eq("task_id", taskId);

    if (deleteFilesError) {
      console.error("Error deleting task files:", deleteFilesError);
      return new Response(
        JSON.stringify({ error: "Failed to delete task files" }),
        { status: 500 }
      );
    }

    // Reset task completion status
    const { error: updateTaskError } = await supabase
      .from("tasks")
      .update({
        completed_at: null,
        completion_status: CompletionStatus.TODO,
        due_date_status: DueDateStatus.UNKNOWN,
      })
      .eq("id", taskId);

    if (updateTaskError) {
      console.error("Error updating task:", updateTaskError);
      return new Response(JSON.stringify({ error: "Failed to update task" }), {
        status: 500,
      });
    }

    // Reset premaster emails sent flag if this is a premaster task
    if (task.name === ReleaseTaskName.PreMastersSubmitted && task.release_id) {
      const { error: updateReleaseError } = await supabase
        .from("releases")
        .update({ premaster_emails_sent: false })
        .eq("id", task.release_id);

      if (updateReleaseError) {
        console.error("Error updating release:", updateReleaseError);
        return new Response(
          JSON.stringify({ error: "Failed to update release" }),
          { status: 500 }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Task status cleared successfully",
        filesDeleted: task.task_files?.length || 0,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error clearing task status:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
};
