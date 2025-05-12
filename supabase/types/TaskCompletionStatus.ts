import { CompletionStatus } from "./CompletionStatus";
import { BadgeColor } from "./BadgeColor";
import type { FileInfo } from "./FileInfo";
import { DueDateStatus } from "./DueDateStatus";

export interface TaskStatus {
    completionStatus: CompletionStatus;
    dueDateStatus: DueDateStatus;
    color: BadgeColor;
    fileInfo: FileInfo | null;
} 