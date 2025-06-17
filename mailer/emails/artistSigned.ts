import type { EmailRequest } from "..";

interface ArtistSignedEmail {
  artistName: string;
  artistEmail: string;
  premasterDueDate: string;
  labelName: string;
  inviteLink: string;
}

export const artistSigned = ({
  artistName,
  artistEmail,
  premasterDueDate,
  labelName,
  inviteLink,
}: ArtistSignedEmail): EmailRequest => {
  return {
    to: artistEmail,
    from: "info@altlabeltools.com",
    reply_to: "info@altlabeltools.com",
    subject: `Artist Signed: ${artistName}`,
    body: `Hey ${artistName}

This is a brief email confirming that the pre-masters for your release are due on ${premasterDueDate}.

One thing that we ask is that you please ensure that you have your Bandcamp and Spotify For Artist Profiles set ahead of submitting pre-masters and can share them along with the record. Failure to do this will make it more difficult for us to pitch your release for playlist inclusion and coverage with these platforms.

For now, we just need you to focus on the music and will be back in touch with a full explanation of how a release on ${labelName} is managed once you have submitted your pre-masters. 

When submitting your pre-masters please make sure you are submitting all tracks and WAV's that have been mixed to -6db. If you are unsure of how to do this please find an Ableton tutorial here.

You can upload your pre-masters on the ALT platform using the following link. First you'll need to set a password or sign in: ${inviteLink}

Files must be named in the following format:

<track number> - <artist name> - <track name> [premaster].wav

e.g.
01 - The Beatles - Hey Jude [premaster].wav

If you have any questions in the meantime please let me us know.

Best
${labelName}

    `,
  };
};
