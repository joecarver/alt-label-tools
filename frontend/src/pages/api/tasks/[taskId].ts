import type { APIRoute } from "astro";
import { supabase } from "@/utils/supabase";
import { keysToCamelCase } from "@/utils/case";
import type { ReleaseTask } from "@/types/ReleaseTask";

export const GET: APIRoute = async ({ params }) => {
  try {
    const { taskId } = params;

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: "Missing required taskId" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch the task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError) {
      console.error("Error fetching task:", taskError);
      return new Response(JSON.stringify({ error: "Failed to fetch task" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Fetch the task status
    const { data: taskStatus, error: statusError } = await supabase
      .from("task_statuses")
      .select("*")
      .eq("task_id", taskId)
      .single();

    if (statusError && statusError.code !== "PGRST116") {
      // PGRST116 is the error code for no rows returned, which is fine
      console.error("Error fetching task status:", statusError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch task status" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const fullTask: ReleaseTask = {
      ...keysToCamelCase(task),
      taskStatus: taskStatus ? keysToCamelCase(taskStatus) : null,
    };

    return new Response(JSON.stringify(fullTask), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in GET /api/tasks/[taskId]:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
