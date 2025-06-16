import type { Database } from "./supabase";
import type { KeysToCamelCase } from "./utils";
import type { TaskFile } from "./TaskFile";

export enum ReleaseTaskName {
  ReleaseDate = "Release Date",
  ContractCreated = "Contract Created",
  PreMastersSubmitted = "Pre Master Due",
  MastersSubmitted = "Mixing and Mastering",
  ArtworkCreation = "Artwork Creation",
  PressRelease = "Press Release",
  MarketingDriver = "Marketing Driver",
  SendToRubadub = "Send to Rubadub",
  PressAndPressRelease = "Press and Press Release",
  PitchToAppleMusic = "Pitch to Apple",
  Release = "Release",
  UpdateScentric = "Update Scentric",
  UploadToBandcamp = "Upload and Pitch to Bandcamp",
}

export type DetectableReleaseTask = Extract<
  ReleaseTaskName,
  | ReleaseTaskName.ContractCreated
  | ReleaseTaskName.PreMastersSubmitted
  | ReleaseTaskName.MastersSubmitted
  | ReleaseTaskName.ArtworkCreation
>;

export type ReleaseTask = KeysToCamelCase<
  Database["public"]["Tables"]["tasks"]["Row"]
> & {
  name: ReleaseTaskName;
  taskFiles: TaskFile[];
};
