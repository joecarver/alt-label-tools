import { adminSupabase } from "./auth";

export const generateInviteLink = async (
  masteringEngineerEmail: string,
  afterAcceptInviteRedirectTo: string
) => {
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    email: masteringEngineerEmail,
    type: "recovery",
    options: {
      redirectTo: `${
        process.env.PUBLIC_SITE_URL || "http://localhost:4321"
      }/accept-invite?redirectTo=${afterAcceptInviteRedirectTo}`,
    },
  });
  if (error) {
    throw error;
  }
  const link = data.properties.action_link;
  return link;
};
