import type { EmailRequest } from "..";
import { getSecret } from "astro:env/server";

export interface MastersSubmittedEmail {
  artistName: string;
  artistEmail: string;
  releaseName: string;
  catalogNumber: string;
  labelName: string;
  labelEmail: string;
  releaseId: string;
}

export const mastersSubmitted = ({
  artistName,
  artistEmail,
  releaseName,
  catalogNumber,
  labelName,
  releaseId,
}: Omit<MastersSubmittedEmail, "labelEmail">): EmailRequest => {
  const siteUrl = getSecret("PUBLIC_SITE_URL") || "https://altlabeltools.com";
  const releaseUrl = `${siteUrl}/releases/${releaseId}`;

  return {
    to: artistEmail,
    from: "info@altlabeltools.com",
    reply_to: "info@altlabeltools.com",
    subject: `Masters Submitted: ${releaseName} (${catalogNumber})`,
    body: `Hey ${artistName}

Your masters have been submitted and are ready for review.

You can view your release and download the masters here: ${releaseUrl}

Best,
${labelName}
`,
  };
};

export const notifyLabelMastersSubmitted = ({
  artistName,
  releaseName,
  catalogNumber,
  labelName,
  labelEmail,
  releaseId,
}: Omit<MastersSubmittedEmail, "artistEmail">): EmailRequest => {
  const siteUrl = getSecret("PUBLIC_SITE_URL") || "https://altlabeltools.com";
  const releaseUrl = `${siteUrl}/releases/${releaseId}`;

  return {
    to: labelEmail,
    from: "info@altlabeltools.com",
    reply_to: "info@altlabeltools.com",
    subject: `Masters Submitted: ${releaseName} (${catalogNumber})`,
    body: `Hi ${labelName}

The masters for ${artistName}'s release "${releaseName}" (${catalogNumber}) have been submitted and are ready for review.

You can view the release and download the masters here: ${releaseUrl}

Best,
Alt Label Tools
`,
  };
};
