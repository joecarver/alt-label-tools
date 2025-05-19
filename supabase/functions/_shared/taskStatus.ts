import type { FileInfo } from "../../types/FileInfo.ts";
import { CompletionStatus } from "../../types/CompletionStatus.ts";
import { BadgeColor } from "../../types/BadgeColor.ts";
import { DueDateStatus } from "../../types/DueDateStatus.ts";
import { parseISO } from "https://esm.sh/date-fns@4.1.0";
import { ReleaseTaskName } from "../../types/ReleaseTask.ts";
import { getFileInfo } from "./drive.ts";

interface TaskCompletionParams {
    taskName: ReleaseTaskName;
    completedAt?: string;
    isDetectable: boolean;
    folderId: string | null;
    dueDate?: string;
}


export const getCompletionStatusColor = (status: CompletionStatus): BadgeColor => {
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

export const getDueDateStatus = (endDate: string | null | undefined, isCompleted: boolean): DueDateStatus => {
    if (!endDate) {
        return DueDateStatus.UNKNOWN;
    }

    if (isCompleted) {
        return DueDateStatus.DONE;
    }

    const today = new Date();
    const dueDate = parseISO(endDate);
    const daysUntilDue = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilDue < 0) {
        return DueDateStatus.OVERDUE;
    } else if (daysUntilDue <= 3) {
        return DueDateStatus.DUE;
    }
    return DueDateStatus.UNKNOWN;
};

export interface TaskStatus {
    completionStatus: CompletionStatus;
    dueDateStatus: DueDateStatus;
    color: BadgeColor;
    fileInfo: FileInfo | null;
}


export async function getTaskCompletionStatus({
    taskName,
    completedAt,
    isDetectable,
    folderId,
    dueDate,
}: TaskCompletionParams): Promise<TaskStatus> {
    const dueDateStatus = getDueDateStatus(dueDate, !!completedAt);

    if (completedAt) {
        return {
            completionStatus: CompletionStatus.DONE_MANUALLY,
            dueDateStatus,
            color: getCompletionStatusColor(CompletionStatus.DONE_MANUALLY),
            fileInfo: null,
        };
    }

    if (!isDetectable || !folderId) {
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


export async function getTaskStatus(
    taskId: string,
    taskName: ReleaseTaskName,
    folderId: string,
    completedAt: string | null | undefined,
    isDetectable: boolean,
    dueDate: string | null | undefined
): Promise<TaskStatus> {
    const params = {
        taskName,
        completedAt: typeof completedAt === "string" ? completedAt : undefined,
        folderId,
        isDetectable,
        dueDate: dueDate ? dueDate : undefined,
    };

    const status = await getTaskCompletionStatus(params);
    if (!status) {
        throw new Error(`Failed to get task status for task ${taskId}`);
    }
    return status;
}