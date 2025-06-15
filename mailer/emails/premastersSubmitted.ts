import type { EmailRequest } from "..";

interface PremastersSubmittedEmail {
  artistName: string;
  artistEmail: string;
  releaseName: string;
  releaseDate: string;
  labelName: string;
  releaseSchedule: string[];
}

export const premastersSubmitted = ({
  artistName,
  artistEmail,
  releaseName,
  releaseDate,
  labelName,
  releaseSchedule,
}: PremastersSubmittedEmail): EmailRequest => {
  return {
    to: artistEmail,
    from: "info@altlabeltools.com",
    reply_to: "info@altlabeltools.com",
    subject: `Pre-Masters Submitted: ${releaseName}`,
    body: `Hey ${artistName}

Hope you're well and excited for your ${labelName} release!

Below is a full breakdown of timelines and everything we need from you before your release on ${releaseDate}. Please take time to read and complete everything carefully.

Release Schedule
${releaseSchedule.map((item) => `- ${item}`).join("\n")}

Let us know if you have any questions.

Best,
${labelName}

    `,
  };
};
