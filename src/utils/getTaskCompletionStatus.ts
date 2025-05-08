import { CompletionStatus } from "@/types/CompletionStatus";
import { getFileInfo } from "./drive";
import { ReleaseTaskName } from "@/types/ReleaseTask";
import { getCompletionStatusColor } from "./getStatusColor";
import type { TaskCompletionStatus } from "@/types/TaskCompletionStatus";

interface TaskCompletionParams {
    clientName: string;
    taskName: ReleaseTaskName;
    releaseId: string;
    completedAt?: string;
    isDetectable: boolean;
    folderId: string | null;
}

export async function getTaskCompletionStatus({
    clientName,
    taskName,
    releaseId,
    completedAt,
    isDetectable,
    folderId,
}: TaskCompletionParams): Promise<TaskCompletionStatus> {
    if (completedAt) {
        return {
            status: CompletionStatus.DONE_MANUALLY,
            color: getCompletionStatusColor(CompletionStatus.DONE_MANUALLY),
            fileInfo: null,
        };
    }

    if (!isDetectable) {
        return { status: CompletionStatus.TODO, color: getCompletionStatusColor(CompletionStatus.TODO), fileInfo: null };
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
        return { status: CompletionStatus.TODO, color: getCompletionStatusColor(CompletionStatus.TODO), fileInfo: null };
    }

    const status = CompletionStatus.DONE_DETECTED;

    return {
        status,
        color: getCompletionStatusColor(status),
        fileInfo,
    };
}