import { ReleaseTaskName } from "@/types/ReleaseTask";
import type { UserReleasePermissionRole } from "@/types/UserReleasePermissionRole";

export const getIsUploadableTask = (
  taskName: ReleaseTaskName,
  isAdmin: boolean,
  userReleasePermissions: UserReleasePermissionRole[]
) => {
  switch (taskName) {
    case ReleaseTaskName.PreMastersSubmitted:
      return isAdmin || userReleasePermissions.includes("Artist");
    case ReleaseTaskName.MastersSubmitted:
      return isAdmin || userReleasePermissions.includes("Mastering Engineer");
    case ReleaseTaskName.ArtworkCreation:
      return isAdmin || userReleasePermissions.includes("Designer");
    default:
      return false;
  }
};
