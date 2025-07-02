import type { APIRoute } from "astro";
import {
  artworkSubmitted,
  notifyLabelArtworkSubmitted,
} from "@/mailer/emails/artworkSubmitted";
import { sendEmail } from "@/mailer/index";
import { getUsersForClient } from "@/utils/supabase";
import type { Artist } from "@/types/Artist";
import { getSecret } from "astro:env/server";

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

    const siteUrl = getSecret("PUBLIC_SITE_URL") || "https://altlabeltools.com";
    const releaseUrl = `${siteUrl}/releases/${releaseId}`;

    // Send email to all artists
    for (const artist of artists as Artist[]) {
      const email = artworkSubmitted({
        artistName: artist.artistName ?? artist.govName ?? "",
        artistEmail: artist.email ?? "",
        releaseName,
        catalogNumber,
        labelName,
        releaseUrl,
      });
      sendEmail(email);
    }

    // Send email to all label users
    for (const labelEmail of labelEmails) {
      const labelEmailContent = notifyLabelArtworkSubmitted({
        artistName: artists[0].artistName ?? artists[0].govName ?? "",
        releaseName,
        catalogNumber,
        labelName,
        labelEmail,
        releaseUrl,
      });
      sendEmail(labelEmailContent);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in handle-artwork-submission:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to handle artwork submission",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
