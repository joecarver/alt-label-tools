import type { EmailRequest } from "../index";

export interface NotifyMasteringEngineerEmail {
  masteringEngineerEmail: string;
  artistName: string;
  releaseName: string;
  catalogNumber: string;
  labelName: string;
  dueDate: string;
  url: string;
}
export const notifyMasteringEngineer = ({
  masteringEngineerEmail,
  artistName,
  releaseName,
  catalogNumber,
  labelName,
  dueDate,
  url,
}: NotifyMasteringEngineerEmail): EmailRequest => {
  return {
    to: masteringEngineerEmail,
    from: "info@altlabeltools.com",
    reply_to: "info@altlabeltools.com",
    subject: `Ready for mastering: ${releaseName} (${catalogNumber})`,
    body: `Hi,
Hope you're well.

${artistName} has uploaded their premasters, you can take a listen and download them [here](${url})

Please master the tracks and upload them to the same link by ${dueDate}

Best
${labelName}
`,
  };
};
