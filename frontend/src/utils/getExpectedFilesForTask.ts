import { type ReleaseTask, ReleaseTaskName } from "@/types/ReleaseTask";

export interface ExpectedFile {
  name: string;
  isRequired: boolean;
}

export function getExpectedFilesForTask(
  task: ReleaseTask,
  otherTasks: ReleaseTask[]
): ExpectedFile[] {
  if (task.name === ReleaseTaskName.ArtworkCreation) {
    return [
      {
        name: "Album Artwork Small.jpg",
        isRequired: true,
      },
      {
        name: "Album Artwork Large.jpg",
        isRequired: true,
      },
      {
        name: "Spotify Header.jpg",
        isRequired: true,
      },
      {
        name: "Single Artwork Small.jpg",
        isRequired: false,
      },
      {
        name: "Single Artwork Large.jpg",
        isRequired: false,
      },
    ];
  } else if (task.name === ReleaseTaskName.MastersSubmitted) {
    const premasterFiles = otherTasks.find(
      (t) => t.name === ReleaseTaskName.PreMastersSubmitted
    )?.taskFiles;
    if (!premasterFiles) {
      return [];
    }
    return premasterFiles.map((f) => ({
      name: f.name.replace("[Premaster]", "[Master]"),
      isRequired: true,
    }));
  }
  return [];
}
