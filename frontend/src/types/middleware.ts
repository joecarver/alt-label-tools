import type { User } from "@supabase/supabase-js";
import type { LabelClient } from "@/types/LabelClient";
import type { Release } from "@/types/Release";

declare global {
  namespace App {
    interface Locals {
      user: User;
      isAdmin: boolean;
      clients: LabelClient[];
      releases: Release[];
    }
  }
}
