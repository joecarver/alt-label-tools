import type { EmailRequest } from "..";
import { getSecret } from "astro:env/server";

export interface ArtworkSubmittedEmail {
  artistName: string;
  artistEmail: string;
  labelEmail: string;
  releaseName: string;
  catalogNumber: string;
  labelName: string;
  releaseId: string;
}

export const artworkSubmitted = ({
  artistName,
  artistEmail,
  releaseName,
  catalogNumber,
  labelName,
  releaseId,
}: Omit<ArtworkSubmittedEmail, "labelEmail">): EmailRequest => {
  const siteUrl = getSecret("PUBLIC_SITE_URL") || "https://altlabeltools.com";
  const releaseUrl = `${siteUrl}/releases/${releaseId}`;

  return {
    to: artistEmail,
    from: "info@altlabeltools.com",
    reply_to: "info@altlabeltools.com",
    subject: `Artwork Submitted: ${releaseName} (${catalogNumber})`,
    body: `Hey ${artistName}

The artwork for your release has been submitted and is ready for review.

You can view your release and download the artwork here: ${releaseUrl}

Best,
${labelName}
`,
  };
};

export const notifyLabelArtworkSubmitted = ({
  artistName,
  releaseName,
  catalogNumber,
  labelName,
  labelEmail,
  releaseId,
}: Omit<ArtworkSubmittedEmail, "artistEmail">): EmailRequest => {
  const siteUrl = getSecret("PUBLIC_SITE_URL") || "https://altlabeltools.com";
  const releaseUrl = `${siteUrl}/releases/${releaseId}`;

  return {
    to: labelEmail,
    from: "info@altlabeltools.com",
    reply_to: "info@altlabeltools.com",
    subject: `Artwork Submitted: ${releaseName} (${catalogNumber})`,
    body: `Hi ${labelName}

The artwork for ${artistName}'s release "${releaseName}" (${catalogNumber}) has been submitted and is ready for review.

You can view the release and download the artwork here: ${releaseUrl}

Best,
Alt Label Tools
`,
  };
};
