import type { LabelClient } from "./LabelClient";

export interface Release {
  id: string;
  name: string;
  catalogNumber: string;
  releaseDate: string;
  artist: string;
  labelId: LabelClient["id"];
  folderId: string | null;
}
