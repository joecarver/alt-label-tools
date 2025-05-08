import { CompletionStatus } from "@/types/CompletionStatus";
import { getFileInfo } from "./drive";
import { ReleaseTaskName } from "@/types/ReleaseTask";
import { getCompletionStatusColor } from "./getStatusColor";
import type { TaskStatus } from "@/types/TaskCompletionStatus";
import { DueDateStatus } from "@/types/DueDateStatus";
import { getDueDateStatus } from "./getDueDateStatus";

interface TaskCompletionParams {
    taskName: ReleaseTaskName;
    completedAt?: string;
    isDetectable: boolean;
    folderId: string | null;
    dueDate?: string;
}

export async function getTaskCompletionStatus({
    taskName,
    completedAt,
    isDetectable,
    folderId,
    dueDate,
}: TaskCompletionParams): Promise<TaskStatus> {
    const dueDateStatus = dueDate ? getDueDateStatus(dueDate, !!completedAt) : DueDateStatus.UNKNOWN;

    if (completedAt) {
        return {
            completionStatus: CompletionStatus.DONE_MANUALLY,
            dueDateStatus,
            color: getCompletionStatusColor(CompletionStatus.DONE_MANUALLY),
            fileInfo: null,
        };
    }

    if (!isDetectable) {
        return {
            completionStatus: CompletionStatus.TODO,
            dueDateStatus,
            color: getCompletionStatusColor(CompletionStatus.TODO),
            fileInfo: null,
        };
    }

    let searchFile = "";

    if (taskName === ReleaseTaskName.ContractCreated) {
        searchFile = "contract";
    } else if (taskName === ReleaseTaskName.PreMastersSubmitted) {
        searchFile = "premaster.flac";
    } else if (taskName === ReleaseTaskName.MastersSubmitted) {
        searchFile = "master.flac";
    } else if (taskName === ReleaseTaskName.ArtworkCreation) {
        searchFile = "artwork.png";
    }

    const fileInfo = await getFileInfo(
        folderId,
        searchFile,
    );

    if (!fileInfo) {
        return {
            completionStatus: CompletionStatus.TODO,
            dueDateStatus,
            color: getCompletionStatusColor(CompletionStatus.TODO),
            fileInfo: null,
        };
    }

    const status = CompletionStatus.DONE_DETECTED;

    return {
        completionStatus: status,
        dueDateStatus,
        color: getCompletionStatusColor(status),
        fileInfo,
    };
}