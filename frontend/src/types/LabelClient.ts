import type { Release } from "./Release";

export interface LabelClient {
  id: string;
  name: string;
  folderId: string | null;
  releases: Release[];
}
