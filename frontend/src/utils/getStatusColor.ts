import { BadgeColor } from "@/types/BadgeColor";
import { CompletionStatus } from "@/types/CompletionStatus";
import { DueDateStatus } from "@/types/DueDateStatus";

export const getCompletionStatusColor = (
  status: CompletionStatus
): BadgeColor => {
  switch (status) {
    case CompletionStatus.TODO:
      return BadgeColor.GRAY;
    case CompletionStatus.IN_PROGRESS:
      return BadgeColor.BLUE;
    case CompletionStatus.DONE_DETECTED:
    case CompletionStatus.DONE_MANUALLY:
      return BadgeColor.GREEN;
    default:
      return BadgeColor.GRAY;
  }
};

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
