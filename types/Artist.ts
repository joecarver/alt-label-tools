import type { Database } from "./supabase";
import type { KeysToCamelCase } from "./utils";

export type Artist = KeysToCamelCase<
  Database["public"]["Tables"]["artists"]["Row"]
>;
