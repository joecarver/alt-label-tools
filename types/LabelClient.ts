import type { Database } from "./supabase";
import type { Release } from "./Release";
import type { KeysToCamelCase } from "./utils";

export type LabelClient = KeysToCamelCase<
  Database["public"]["Tables"]["clients"]["Row"]
> & {
  releases: Release[];
};
