import { supabase } from "./auth";

export const generateStaticUrl = async (
  releaseId: string,
  masteringEngineerEmail: string
) => {
  const { data, error } = await supabase.auth.admin.generateLink({
    email: masteringEngineerEmail,
    type: "magiclink",
    options: {
      redirectTo: `${process.env.PUBLIC_SITE_URL}/release/${releaseId}`,
    },
  });
  if (error) {
    throw error;
  }
  const link = data.properties.action_link;
  return link;
};
