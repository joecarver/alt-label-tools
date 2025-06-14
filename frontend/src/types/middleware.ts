import type { User } from "@supabase/supabase-js";
import type { LabelClient } from "@/types/LabelClient";

declare global {
  namespace App {
    interface Locals {
      user: User;
      isAdmin: boolean;
      clients: LabelClient[];
    }
  }
}
