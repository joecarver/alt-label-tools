import type { Release } from "@/types/Release";
import { ReleaseTaskName } from "@/types/ReleaseTask";

const taskNameMap: Partial<Record<ReleaseTaskName, string>> = {
  [ReleaseTaskName.PreMastersSubmitted]: "Premasters",
  [ReleaseTaskName.MastersSubmitted]: "Masters",
  [ReleaseTaskName.ArtworkCreation]: "Artwork",
  [ReleaseTaskName.ContractCreated]: "Contracts",
};

export const getDownloadFilename = (
  release: Release,
  taskName: ReleaseTaskName
) => {
  return `${release.artists.map((artist) => artist.artistName).join(", ")} - ${
    release.name
  } (${release.catalogNumber}) [${taskNameMap[taskName]}].zip`;
};
