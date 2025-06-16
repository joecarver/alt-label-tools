import type { Database } from "./supabase";
import type { Artist } from "./Artist";
import type { KeysToCamelCase } from "./utils";

export type Release = KeysToCamelCase<
  Database["public"]["Tables"]["releases"]["Row"]
> & {
  artists: Artist[];
  masteringEngineer: Database["public"]["Tables"]["mastering_engineer"]["Row"];
  client: Database["public"]["Tables"]["clients"]["Row"];
};

export type ReleaseWithArtists = Release;
