import type { APIRoute } from "astro";
import { premastersSubmitted } from "@/mailer/emails/premastersSubmitted";
import { sendEmail } from "@/mailer/index";
import { setReleasePreamastersEmailsSent } from "@/utils/supabase";
import { ReleaseTaskName, type ReleaseTask } from "@/types/ReleaseTask";
import { formatSingleDate } from "@/utils/date";
import type { Artist } from "@/types/Artist";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      releaseName,
      catalogNumber,
      releaseDate,
      labelName,
      artists,
      tasks,
      releaseId,
    } = body;

    if (
      !releaseName ||
      !releaseDate ||
      !labelName ||
      !artists ||
      !tasks ||
      !releaseId
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build release schedule
    const releaseSchedule = tasks
      .filter((task: ReleaseTask) =>
        [
          ReleaseTaskName.ContractCreated,
          ReleaseTaskName.ArtworkCreation,
          ReleaseTaskName.PressRelease,
          ReleaseTaskName.UploadToBandcamp,
          ReleaseTaskName.PressAndPressRelease,
        ].includes(task.name)
      )
      .map((task: ReleaseTask) => {
        let taskDueDateString = `${task.name}`;
        if (task.startDate) {
          taskDueDateString += ` - ${formatSingleDate(task.startDate)}`;
        }
        if (task.endDate && task.endDate !== task.startDate) {
          taskDueDateString += ` - ${formatSingleDate(task.endDate)}`;
        }
        return taskDueDateString;
      });

    // Send emails to all artists
    for (const artist of artists as Artist[]) {
      const email = premastersSubmitted({
        artistName: artist.artistName ?? artist.govName ?? "",
        artistEmail: artist.email ?? "",
        releaseName,
        catalogNumber,
        releaseDate,
        labelName,
        releaseSchedule,
      });
      sendEmail(email);
    }

    // Update release to mark emails as sent
    await setReleasePreamastersEmailsSent(releaseId, true);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in handle-premaster-submission:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to handle premaster submission",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
