import type { Database } from "./supabase";
import type { Artist } from "./Artist";
import type { KeysToCamelCase } from "./utils";

export type Release = KeysToCamelCase<
  Database["public"]["Tables"]["releases"]["Row"]
> & {
  artists: Artist[];
  masteringEngineerEmail: string;
};

export type ReleaseWithArtists = Release;
