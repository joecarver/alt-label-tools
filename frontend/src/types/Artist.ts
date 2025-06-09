import type { Database } from "../../../supabase/types";
import type { KeysToCamelCase } from "./utils";

export type Artist = KeysToCamelCase<
  Database["public"]["Tables"]["artists"]["Row"]
>;
