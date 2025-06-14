import { BadgeColor } from "@/types/BadgeColor";
import { DueDateStatus } from "@/types/DueDateStatus";

export const getDueDateStatusColor = (status?: DueDateStatus): BadgeColor => {
  if (!status) {
    return BadgeColor.GRAY;
  }

  switch (status) {
    case DueDateStatus.DUE:
      return BadgeColor.ORANGE;
    case DueDateStatus.OVERDUE:
      return BadgeColor.RED;
    default:
      return BadgeColor.GRAY;
  }
};
