import type { EmailRequest } from "../index";

export interface InviteUserEmail {
  email: string;
  name: string;
  inviteLink: string;
}

export const inviteUserEmail = ({
  email,
  name,
  inviteLink,
}: InviteUserEmail): EmailRequest => {
  return {
    to: email,
    from: "info@altlabeltools.com",
    reply_to: "info@altlabeltools.com",
    subject: `Welcome to Alt Label Tools`,
    body: `Hi ${name},

    Welcome to Alt Label Tools. You can set a password and access your account using the link below:

    ${inviteLink}

    Best,
    Alt Label Tools`,
  };
};
