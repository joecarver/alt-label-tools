import type { Database } from "../../../supabase/types";
import type { KeysToCamelCase } from "./utils";

export type LabelClient = KeysToCamelCase<
  Database["public"]["Tables"]["clients"]["Row"]
> & {
  releaseCount: number;
};
