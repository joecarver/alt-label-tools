import type { Database } from "../../../supabase/types";
import type { Artist } from "./Artist";
import type { KeysToCamelCase } from "./utils";

export type Release = KeysToCamelCase<
  Database["public"]["Tables"]["releases"]["Row"]
> & {
  artists: Artist[];
  releaseDate: string;
};

export type ReleaseWithArtists = Release;
