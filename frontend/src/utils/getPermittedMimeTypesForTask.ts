import { type ReleaseTask, ReleaseTaskName } from "@/types/ReleaseTask";

export function getPermittedMimeTypesForTask(task: ReleaseTask): string[] {
  switch (task.name) {
    case ReleaseTaskName.ContractCreated:
      return ["application/pdf"];
    case ReleaseTaskName.PreMastersSubmitted:
      return ["audio/wav", "audio/flac", "audio/aiff"];
    case ReleaseTaskName.MastersSubmitted:
      return ["audio/wav", "audio/flac", "audio/aiff"];
    case ReleaseTaskName.ArtworkCreation:
      return ["image/jpeg", "image/png", "image/tiff"];
    default:
      return [];
  }
}
