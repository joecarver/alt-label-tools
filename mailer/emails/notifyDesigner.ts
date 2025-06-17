import { type EmailRequest } from "../index";

export interface NotifyDesignerEmail {
  designerEmail: string;
  artistName: string;
  releaseName: string;
  catalogNumber: string;
  labelName: string;
  dueDate: string;
  inviteLink: string;
}

export const notifyDesigner = ({
  designerEmail,
  artistName,
  releaseName,
  catalogNumber,
  labelName,
  dueDate,
  inviteLink,
}: NotifyDesignerEmail): EmailRequest => {
  return {
    to: designerEmail,
    from: "info@altlabeltools.com",
    reply_to: "info@altlabeltools.com",
    subject: `Ready for design: ${releaseName} (${catalogNumber})`,
    body: `Hi

Hope you're well.

${artistName} has uploaded their music to Google Drive, you can take a listen and download them using the link below. Please note that you will need to first set a password to access the music.

${inviteLink}

Please begin creating the artwork for the release and save it in the same link by ${dueDate}

Please ensure that the below sizings are provided:

Album Artwork 3000x3000
Single Artwork 3000x3000
Album Artwork 1920x1020
Single Artwork 1920x1020
Spotify Header 2660px x 1140px

If you have any questions, please email info@altlabeltools.com

Best
${labelName}
`,
  };
};
