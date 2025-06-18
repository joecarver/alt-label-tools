import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Determines if the MP3 tagging process should be triggered after a file upload.
 * @param task The current task object (with name and related release info)
 * @param fileName The name of the file being uploaded
 * @param releaseTasks All tasks for the release, including their files
 * @returns true if MP3 tagging should be triggered, false otherwise
 */
export default function shouldTriggerMp3Tagging(
  task: { name: string },
  fileName: string,
  releaseTasks: Array<{
    name: string;
    task_files?: Array<{ name?: string | null }>;
  }>
): boolean {
  // Import ReleaseTaskName dynamically to avoid circular deps if needed
  const ReleaseTaskName = {
    MastersSubmitted: "Mixing and Mastering",
    ArtworkCreation: "Artwork Creation",
  };

  const isMasteringTask = task.name === ReleaseTaskName.MastersSubmitted;
  const isArtworkTask = task.name === ReleaseTaskName.ArtworkCreation;

  if (!isMasteringTask && !isArtworkTask) return false;

  const masteringTask = releaseTasks.find(
    (t) => t.name === ReleaseTaskName.MastersSubmitted
  );
  const artworkTask = releaseTasks.find(
    (t) => t.name === ReleaseTaskName.ArtworkCreation
  );

  const hasMasterFiles =
    masteringTask?.task_files && masteringTask.task_files.length > 0;
  const hasArtworkSmall = artworkTask?.task_files?.some((f) =>
    f?.name?.toLowerCase().includes("album artwork small")
  );
  const isUploadingArtworkSmall = fileName
    ?.toLowerCase()
    .includes("album artwork small");

  // If uploading a master file and artwork small already exists
  if (isMasteringTask && hasArtworkSmall) return true;
  // If uploading artwork small and there are already master files
  if (isArtworkTask && isUploadingArtworkSmall && hasMasterFiles) return true;

  return false;
}

/**
 * Checks if MP3 tagging should be triggered for a file upload, including all necessary Supabase queries.
 * Returns { shouldTrigger, release } if tagging should be triggered, or { shouldTrigger: false } otherwise.
 */
export async function shouldTriggerMp3TaggingForUpload(
  supabase: SupabaseClient<any, any, any>,
  taskId: string,
  fileName: string
): Promise<
  | {
      shouldTrigger: true;
      release: {
        artwork_folder_id: string;
        masters_folder_id: string;
        name: string;
      };
    }
  | { shouldTrigger: false }
> {
  // Get task details
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select(
      `
      *,
      releases (
        id,
        name,
        masters_folder_id,
        artwork_folder_id
      )
    `
    )
    .eq("id", taskId)
    .single();

  if (taskError || !task || !task.releases) {
    return { shouldTrigger: false };
  }
  const release = task.releases;
  const ReleaseTaskName = {
    MastersSubmitted: "Mixing and Mastering",
    ArtworkCreation: "Artwork Creation",
  };
  const isMasteringTask = task.name === ReleaseTaskName.MastersSubmitted;
  const isArtworkTask = task.name === ReleaseTaskName.ArtworkCreation;
  if (!isMasteringTask && !isArtworkTask) {
    return { shouldTrigger: false };
  }
  // Get all tasks for this release
  const { data: releaseTasks, error: releaseTasksError } = await supabase
    .from("tasks")
    .select(
      `
      id,
      name,
      task_files (
        id,
        name
      )
    `
    )
    .eq("release_id", release.id)
    .in("name", [
      ReleaseTaskName.MastersSubmitted,
      ReleaseTaskName.ArtworkCreation,
    ]);
  if (releaseTasksError || !releaseTasks) {
    return { shouldTrigger: false };
  }
  if (shouldTriggerMp3Tagging(task, fileName, releaseTasks)) {
    return {
      shouldTrigger: true,
      release: {
        artwork_folder_id: release.artwork_folder_id,
        masters_folder_id: release.masters_folder_id,
        name: release.name,
      },
    };
  }
  return { shouldTrigger: false };
}
