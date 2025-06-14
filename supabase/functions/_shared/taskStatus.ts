import { CompletionStatus } from "@/types/CompletionStatus.ts";
import { BadgeColor } from "@/types/BadgeColor.ts";
import { DueDateStatus } from "@/types/DueDateStatus.ts";
import { parseISO } from "https://esm.sh/date-fns@4.1.0";
import { listFilesInFolder } from "./drive.ts";
import type { TaskStatus } from "@/types/TaskStatus.ts";

interface TaskCompletionParams {
  folderId: string | null;
  dueDate?: string;
  permittedMimeTypes?: string[];
}

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

export async function getTaskCompletionStatus({
  folderId,
  permittedMimeTypes,
  dueDate,
}: TaskCompletionParams): Promise<TaskStatus> {
  if (!folderId) {
    return {
      completionStatus: CompletionStatus.TODO,
      dueDateStatus: DueDateStatus.UNKNOWN,
      files: [],
    };
  }

  const files = await listFilesInFolder(folderId, permittedMimeTypes);

  if (!files || files.length === 0) {
    const dueDateStatus = getDueDateStatus(dueDate, false);
    return {
      completionStatus: CompletionStatus.TODO,
      dueDateStatus,
      files: [],
    };
  }

  const dueDateStatus = getDueDateStatus(dueDate, true);

  return {
    completionStatus: CompletionStatus.DONE_DETECTED,
    dueDateStatus,
    files,
  };
}
