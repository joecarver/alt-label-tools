import type { APIRoute } from "astro";
import {
  mastersSubmitted,
  notifyLabelMastersSubmitted,
} from "@/mailer/emails/mastersSubmitted";
import { sendEmail } from "@/mailer/index";
import { getUsersForClient } from "@/utils/supabase";
import type { Artist } from "@/types/Artist";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      releaseName,
      catalogNumber,
      artists,
      releaseId,
      labelName,
      clientId,
    } = body;

    if (
      !releaseName ||
      !catalogNumber ||
      !artists ||
      !releaseId ||
      !labelName ||
      !clientId
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get label users (people with access to the client)
    const labelUsers = await getUsersForClient(clientId);
    const labelEmails = labelUsers.map((user) => user.email).filter(Boolean);

    // Send email to all artists
    for (const artist of artists as Artist[]) {
      const email = mastersSubmitted({
        artistName: artist.artistName ?? artist.govName ?? "",
        artistEmail: artist.email ?? "",
        releaseName,
        catalogNumber,
        labelName,
        releaseId,
      });
      sendEmail(email);
    }

    // Send email to all label users
    for (const labelEmail of labelEmails) {
      const labelEmailContent = notifyLabelMastersSubmitted({
        artistName: artists[0].artistName ?? artists[0].govName ?? "",
        releaseName,
        catalogNumber,
        labelName,
        labelEmail,
        releaseId,
      });
      sendEmail(labelEmailContent);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in handle-master-submission:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to handle master submission",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
