import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../supabase/types";

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabase = createClient<Database>(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const data = await request.json();
    const {
      artist_name,
      email,
      address,
      gov_name,
      catalog_number,
      name,
      license_allow_politics,
      license_allow_alcohol,
      license_allow_pharmaceuticals,
      license_allow_fastfood,
      license_allow_fastfashion,
      mastering_engineer_email,
      designer_email,
      release_date,
      campaign_length,
      services_required,
      client_id,
    } = data;

    // First, create or get the artist
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .upsert({
        artist_name,
        email,
        address,
        gov_name,
      })
      .select()
      .single();

    if (artistError) throw artistError;

    // Create or get the mastering engineer
    const { data: masteringEngineer, error: masteringError } = await supabase
      .from("mastering_engineer")
      .upsert({
        email: mastering_engineer_email,
        name: mastering_engineer_email,
      })
      .select()
      .single();

    if (masteringError) throw masteringError;

    // Create or get the designer
    const { data: designer, error: designerError } = await supabase
      .from("designer")
      .upsert({
        email: designer_email,
        name: designer_email,
      })
      .select()
      .single();

    if (designerError) throw designerError;

    // Create the release
    const { data: release, error: releaseError } = await supabase
      .from("releases")
      .insert({
        catalog_number,
        name,
        license_allow_politics,
        license_allow_alcohol,
        license_allow_pharmaceuticals,
        license_allow_fastfood,
        license_allow_fastfashion,
        mastering_engineer: masteringEngineer.id,
        designer: designer.id,
        client_id,
      })
      .select()
      .single();

    if (releaseError) throw releaseError;

    // Create the release-artist relationship
    const { error: releaseArtistError } = await supabase
      .from("release_artists")
      .insert({
        release_id: release.id,
        artist_id: artist.id,
      });

    if (releaseArtistError) throw releaseArtistError;

    return new Response(JSON.stringify({ success: true, release }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error creating release:", error);
    return new Response(JSON.stringify({ error: "Failed to create release" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
