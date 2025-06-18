import type { APIRoute } from "astro";
import { premastersSubmitted } from "@/mailer/emails/premastersSubmitted";
import { notifyMasteringEngineer } from "@/mailer/emails/notifyMasteringEngineer";
import { notifyDesigner } from "@/mailer/emails/notifyDesigner";
import { sendEmail } from "@/mailer/index";
import { getTasks, setReleasePreamastersEmailsSent } from "@/utils/supabase";
import { ReleaseTaskName, type ReleaseTask } from "@/types/ReleaseTask";
import { formatSingleDate } from "@/utils/date";
import type { Artist } from "@/types/Artist";
import { copyAndReplaceDocsInFolder } from "@/utils/drive";
import { generateInviteLink } from "@/utils/url";

// Helper to compute replacements for a given artist and request body
function buildReplacements({
  catalogNumber,
  labelName,
  artist,
  licenseAllowPolitics,
  licenseAllowAlcohol,
  licenseAllowPharmaceuticals,
  licenseAllowFastFood,
  licenseAllowFastFashion,
}: {
  catalogNumber: string;
  labelName: string;
  artist: Artist;
  licenseAllowPolitics: boolean;
  licenseAllowAlcohol: boolean;
  licenseAllowPharmaceuticals: boolean;
  licenseAllowFastFood: boolean;
  licenseAllowFastFashion: boolean;
}) {
  return [
    { search: "{{Release Number}}", replace: catalogNumber },
    { search: "{{Artist Name}}", replace: artist.artistName ?? "" },
    { search: "{{Label}}", replace: labelName },
    { search: "{{Full Name}}", replace: artist.govName ?? "" },
    {
      search: "{{Timestamp}}",
      replace: formatSingleDate(new Date().toISOString()),
    },
    { search: "{{Artist Address}}", replace: artist.address ?? "" },
    { search: "{{Artist Email}}", replace: artist.email ?? "" },
    { search: "{{Politics}}", replace: licenseAllowPolitics ? "No" : "Yes" },
    { search: "{{Alcohol}}", replace: licenseAllowAlcohol ? "No" : "Yes" },
    {
      search: "{{Pharmaceuticals}}",
      replace: licenseAllowPharmaceuticals ? "No" : "Yes",
    },
    { search: "{{Fast Food}}", replace: licenseAllowFastFood ? "No" : "Yes" },
    {
      search: "{{Fast Fashion}}",
      replace: licenseAllowFastFashion ? "No" : "Yes",
    },
  ];
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      releaseName,
      catalogNumber,
      releaseDate,
      labelName,
      artists,
      releaseId,
      destFolderId,
      licenseAllowPolitics,
      licenseAllowAlcohol,
      licenseAllowPharmaceuticals,
      licenseAllowFastFood,
      licenseAllowFastFashion,
      masteringEngineerEmail,
      designerEmail,
    } = body;

    if (!releaseName || !releaseDate || !labelName || !artists || !releaseId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const tasks = await getTasks(releaseId);

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

      // Copy and personalize Google Docs for this artist
      if (destFolderId) {
        const replacements = buildReplacements({
          catalogNumber,
          labelName,
          artist,
          licenseAllowPolitics,
          licenseAllowAlcohol,
          licenseAllowPharmaceuticals,
          licenseAllowFastFood,
          licenseAllowFastFashion,
        });
        await copyAndReplaceDocsInFolder(
          destFolderId,
          catalogNumber,
          replacements
        );
      }
    }

    // send email to mastering engineer
    if (masteringEngineerEmail) {
      const inviteLink = await generateInviteLink(
        masteringEngineerEmail,
        `/releases/${releaseId}`
      );

      const masteringDueDate = tasks.find(
        (task) => task.name === ReleaseTaskName.MastersSubmitted
      )?.startDate;

      const email = notifyMasteringEngineer({
        masteringEngineerEmail,
        artistName: artists[0].artistName ?? artists[0].govName ?? "",
        releaseName,
        catalogNumber,
        labelName,
        dueDate: formatSingleDate(masteringDueDate!),
        inviteLink,
      });
      sendEmail(email);
    }

    // send email to designer
    if (designerEmail) {
      const inviteLink = await generateInviteLink(
        designerEmail,
        `/releases/${releaseId}`
      );

      const designerDueDate = tasks.find(
        (task) => task.name === ReleaseTaskName.ArtworkCreation
      )?.startDate;

      const email = notifyDesigner({
        designerEmail,
        artistName: artists[0].artistName ?? artists[0].govName ?? "",
        releaseName,
        catalogNumber,
        labelName,
        dueDate: formatSingleDate(designerDueDate!),
        inviteLink,
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
