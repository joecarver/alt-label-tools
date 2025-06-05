import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../supabase/types";
import { createDriveFolder } from "../../utils/drive";
import { getSecret } from "astro:env/server";

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
      client_folder_id,
    } = data;

    // Create a Google Drive folder for the release under the client's folder if provided
    const releaseFolderId = await createDriveFolder(
      name,
      client_folder_id || undefined
    );

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

    // Insert a task_status for each task
    const statusInserts = (insertedTasks || []).map((task: any) => ({
      task_id: task.id,
      completion_status: "Not Started",
      due_date_status: "On Time",
      color: "gray",
      file_info: null,
    }));
    if (statusInserts.length > 0) {
      const { error: statusError } = await supabase
        .from("task_statuses")
        .insert(statusInserts);
      if (statusError) throw statusError;
    }

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
