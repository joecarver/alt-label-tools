
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
    authToken: string | null;
    folderId: string | null;
}

export const getTaskCompletionStatus = async (params: TaskCompletionParams): Promise<TaskCompletionStatus | null> => {
    if (params.completedAt) {
        return {
            status: CompletionStatus.DONE_MANUALLY,
            color: getCompletionStatusColor(CompletionStatus.DONE_MANUALLY),
            fileInfo: null,
        };
    }

    if (!params.authToken || !params.isDetectable) {
        return null;
    }

    let searchFile = "";

    if (params.taskName === ReleaseTaskName.ContractCreated) {
        searchFile = "contract";
    } else if (params.taskName === ReleaseTaskName.PreMastersSubmitted) {
        searchFile = "premaster.flac";
    } else if (params.taskName === ReleaseTaskName.MastersSubmitted) {
        searchFile = "master.flac";
    } else if (params.taskName === ReleaseTaskName.ArtworkCreation) {
        searchFile = "artwork.png";
    }

    const fileInfo = await getFileInfo(
        params.folderId,
        searchFile,
        params.authToken,
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
};