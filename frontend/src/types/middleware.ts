import type { User } from "./User";
import type { LabelClient } from "./LabelClient";

declare module "astro" {
  interface Locals {
    user: User;
    clients: LabelClient[];
  }
}
