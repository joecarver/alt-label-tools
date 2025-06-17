import { adminSupabase } from "./auth";
import { getSecret } from "astro:env/server";

export const generateInviteLink = async (
  email: string,
  afterAcceptInviteRedirectTo: string
) => {
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    email,
    type: "recovery",
    options: {
      redirectTo: `${
        getSecret("PUBLIC_SITE_URL") || "http://localhost:4321"
      }/accept-invite?redirectTo=${afterAcceptInviteRedirectTo}`,
    },
  });
  if (error) {
    throw error;
  }
  const link = data.properties.action_link;
  return link;
};
