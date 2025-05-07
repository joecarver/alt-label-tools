import { CompletionStatus } from "./CompletionStatus";
import { BadgeColor } from "./BadgeColor";
import type { FileInfo } from "./FileInfo";

export interface TaskCompletionStatus {
    status: CompletionStatus;
    color: BadgeColor;
    fileInfo: FileInfo | null;
} 