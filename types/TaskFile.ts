import type { Database } from "./supabase";
import type { KeysToCamelCase } from "./utils";

export type TaskFile = KeysToCamelCase<
  Database["public"]["Tables"]["task_files"]["Row"]
>;
