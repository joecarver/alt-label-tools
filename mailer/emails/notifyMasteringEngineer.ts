import type { EmailRequest } from "../index";

export interface NotifyMasteringEngineerEmail {
  masteringEngineerEmail: string;
  artistName: string;
  releaseName: string;
  catalogNumber: string;
  labelName: string;
  dueDate: string;
  inviteLink: string;
}
export const notifyMasteringEngineer = ({
  masteringEngineerEmail,
  artistName,
  releaseName,
  catalogNumber,
  labelName,
  dueDate,
  inviteLink,
}: NotifyMasteringEngineerEmail): EmailRequest => {
  return {
    to: masteringEngineerEmail,
    from: "info@altlabeltools.com",
    reply_to: "info@altlabeltools.com",
    subject: `Ready for mastering: ${releaseName} (${catalogNumber})`,
    body: `Hi,
Hope you're well.

${artistName} has uploaded their premasters, you can take a listen and download them using the link below. Please note that you will need to first set a password to access the premasters.

${inviteLink}

Please master the tracks and upload them to the same link by ${dueDate}

Best
${labelName}
`,
  };
};
