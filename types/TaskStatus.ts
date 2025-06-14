import type { TaskFile } from "./TaskFile";
import { CompletionStatus } from "./CompletionStatus";
import { DueDateStatus } from "./DueDateStatus";

export interface TaskStatus {
  completionStatus: CompletionStatus;
  dueDateStatus: DueDateStatus;
  files: TaskFile[];
}
