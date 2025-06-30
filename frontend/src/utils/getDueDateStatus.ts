import { BadgeColor } from "@/types/BadgeColor";
import { DueDateStatus } from "@/types/DueDateStatus";
import { parseISO } from "date-fns";

export const getDueDateStatus = (
  endDate: string | null | undefined,
  isCompleted: boolean
): DueDateStatus => {
  if (!endDate) {
    return DueDateStatus.UNKNOWN;
  }

  if (isCompleted) {
    return DueDateStatus.DONE;
  }

  const today = new Date();
  const dueDate = parseISO(endDate);
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilDue < 0) {
    return DueDateStatus.OVERDUE;
  } else if (daysUntilDue <= 3) {
    return DueDateStatus.DUE;
  }
  return DueDateStatus.UNKNOWN;
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
