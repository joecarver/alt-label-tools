import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { createDriveFolder } from "@/utils/drive";
import { getSecret } from "astro:env/server";
import { artistSigned } from "@/mailer/emails/artistSigned";
import { sendEmail } from "@/mailer/index";
import { ReleaseTaskName } from "@/types/ReleaseTask";
import { formatSingleDate } from "@/utils/date";
import { supabase as adminSupabase, getOrCreateUser } from "@/utils/supabase";
import { randomBytes } from "crypto";

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabase = createClient<Database>(
      getSecret("SUPABASE_URL") || "",
      getSecret("SUPABASE_SERVICE_ROLE_KEY") || ""
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
      client_name,
      client_folder_id,
    } = data;

    const releaseFolderName = `${catalog_number} - ${artist_name} - ${name}`;

    // Create a Google Drive folder for the release under the client's folder if provided
    const releaseFolderId = await createDriveFolder(
      releaseFolderName,
      client_folder_id || undefined
    );

    const preMastersFolderId = await createDriveFolder(
      "Premasters",
      releaseFolderId
    );
    const mastersFolderId = await createDriveFolder("Masters", releaseFolderId);
    const artworkFolderId = await createDriveFolder("Artwork", releaseFolderId);
    const documentationFolderId = await createDriveFolder(
      "Documentation",
      releaseFolderId
    );

    // First, create or get the artist
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .upsert(
        {
          artist_name,
          email,
          address,
          gov_name,
        },
        {
          onConflict: "email",
        }
      )
      .select()
      .single();

    if (artistError) throw artistError;

    // Create or get the mastering engineer
    const { data: masteringEngineer, error: masteringError } = await supabase
      .from("mastering_engineer")
      .upsert(
        {
          email: mastering_engineer_email,
          name: mastering_engineer_email,
        },
        {
          onConflict: "email",
        }
      )
      .select()
      .single();

    if (masteringError) throw masteringError;

    // Create or get the designer
    const { data: designer, error: designerError } = await supabase
      .from("designer")
      .upsert(
        {
          email: designer_email,
          name: designer_email,
        },
        {
          onConflict: "email",
        }
      )
      .select()
      .single();

    if (designerError) throw designerError;

    // Create the release
    const { data: release, error: releaseError } = await supabase
      .from("releases")
      .insert({
        catalog_number,
        name,
        release_date,
        license_allow_politics,
        license_allow_alcohol,
        license_allow_pharmaceuticals,
        license_allow_fastfood,
        license_allow_fastfashion,
        mastering_engineer: masteringEngineer.id,
        designer: designer.id,
        client_id,
        folder_id: releaseFolderId,
        premasters_folder_id: preMastersFolderId,
        masters_folder_id: mastersFolderId,
        artwork_folder_id: artworkFolderId,
        documentation_folder_id: documentationFolderId,
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

    // Generate and insert tasks for the release
    const parseDate = (dateStr: string) => new Date(dateStr);
    const addDays = (date: Date, days: number) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    };
    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    const releaseDate = parseDate(release_date);
    const campaignWeeks = Number(campaign_length);

    const tasks12 = [
      { name: "Contract Created", duration: 0, daysFromRelease: 85 },
      { name: "Pre Master Due", duration: 0, daysFromRelease: 85 },
      { name: "Mixing and Mastering", duration: 12, daysFromRelease: 84 },
      { name: "Artwork Creation", duration: 12, daysFromRelease: 84 },
      { name: "Press Release", duration: 12, daysFromRelease: 84 },
      { name: "Marketing Driver Created", duration: 5, daysFromRelease: 71 },
      { name: "Send to Rubadub", duration: 0, daysFromRelease: 65 },
      {
        name: "Upload and Pitch to Bandcamp",
        duration: 0,
        daysFromRelease: 65,
      },
      { name: "Press and PR", duration: 58, daysFromRelease: 59 },
      { name: "Single 1 Released", duration: 0, daysFromRelease: 23 },
      { name: "Single 2 Released", duration: 0, daysFromRelease: 9 },
      { name: "Pitch To Apple", duration: 0, daysFromRelease: 11 },
      { name: "Release Date", duration: 0, daysFromRelease: 0 },
      { name: "Update Scentric", duration: 0, daysFromRelease: -3 },
    ];
    const tasks8 = [
      { name: "Contract Created", duration: 0, daysFromRelease: 56 },
      { name: "Pre Master Due", duration: 0, daysFromRelease: 56 },
      { name: "Mixing and Mastering", duration: 5, daysFromRelease: 55 },
      { name: "Artwork Creation", duration: 5, daysFromRelease: 55 },
      { name: "Press Release", duration: 5, daysFromRelease: 55 },
      { name: "Marketing Driver Created", duration: 2, daysFromRelease: 49 },
      { name: "Send to Rubadub", duration: 0, daysFromRelease: 48 },
      {
        name: "Upload and Pitch to Bandcamp",
        duration: 0,
        daysFromRelease: 48,
      },
      { name: "Press and PR", duration: 46, daysFromRelease: 47 },
      { name: "Single 1 Released", duration: 0, daysFromRelease: 15 },
      { name: "Single 2 Released", duration: 0, daysFromRelease: 8 },
      { name: "Pitch To Apple", duration: 0, daysFromRelease: 11 },
      { name: "Release Date", duration: 0, daysFromRelease: 0 },
      { name: "Update Scentric", duration: 0, daysFromRelease: -3 },
    ];
    const taskTemplates = campaignWeeks === 12 ? tasks12 : tasks8;
    const taskInserts = taskTemplates.map((task) => {
      const start = addDays(releaseDate, -task.daysFromRelease);
      const end = task.duration > 0 ? addDays(start, task.duration) : start;
      return {
        name: task.name,
        release_id: release.id,
        start_date: formatDate(start),
        end_date: formatDate(end),
        is_detectable: [
          "Contract Created",
          "Pre Master Due",
          "Mixing and Mastering",
          "Artwork Creation",
        ].includes(task.name),
      };
    });
    const { error: tasksError, data: insertedTasks } = await supabase
      .from("tasks")
      .insert(taskInserts)
      .select();
    if (tasksError) throw tasksError;

    // Send email to artist
    const artistSignedEmail = artistSigned({
      artistName: artist_name,
      artistEmail: email,
      premasterDueDate: formatSingleDate(
        taskInserts.find(
          (task) => task.name === ReleaseTaskName.PreMastersSubmitted
        )?.start_date || ""
      ),
      labelName: client_name,
      googleDriveFolder: `https://drive.google.com/drive/folders/${preMastersFolderId}`,
    });

    sendEmail(artistSignedEmail);

    // Get or create users for artist, mastering engineer, designer
    const artistUser = await getOrCreateUser(email);
    const masteringUser = await getOrCreateUser(mastering_engineer_email);
    const designerUser = await getOrCreateUser(designer_email);

    // Add user_release_permissions for each
    const userReleasePermissions = [
      {
        user_id: artistUser.id,
        release_id: release.id,
        role: "Artist" as const,
      },
      {
        user_id: masteringUser.id,
        release_id: release.id,
        role: "Mastering Engineer" as const,
      },
      {
        user_id: designerUser.id,
        release_id: release.id,
        role: "Designer" as const,
      },
    ];
    for (const perm of userReleasePermissions) {
      await supabase.from("user_release_permissions").insert(perm);
    }

    return new Response(JSON.stringify({ success: true, release }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Error creating release:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create release, error: " + error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
