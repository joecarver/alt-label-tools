import type { APIRoute } from "astro";
import { updateTaskCompletion } from "../../utils/supabase";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const taskId = formData.get("taskId");
    const completedAt = formData.get("completedAt");

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

    await updateTaskCompletion(
      taskId.toString(),
      (completedAt || "").toString()
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error updating task completion:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update task completion" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
