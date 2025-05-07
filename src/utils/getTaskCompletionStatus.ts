
import { CompletionStatus } from "@/types/CompletionStatus";
import { getFileInfo } from "./drive";
import type { BadgeColor } from "@/types/BadgeColor";

import { ReleaseTaskName } from "@/types/ReleaseTask";
import type { ReleaseTask } from "@/types/ReleaseTask";
import { isDetectableTask } from "./isDetectableTask";
import { getCompletionStatusColor } from "./getStatusColor";

export const getTaskCompletionStatus = async (clientName: string, task: ReleaseTask, authToken: string | null) => {
    if (!authToken || !isDetectableTask(task.name)) {
        return null;
    }

    const searchFolder = `Clients/${clientName}/Releases/${task.releaseId}`;
    let searchFile = "";

    if (task.name === ReleaseTaskName.ContractCreated) {
        searchFile = "contract";
    } else if (task.name === ReleaseTaskName.PreMastersSubmitted) {
        searchFile = "premaster.flac";
    } else if (task.name === ReleaseTaskName.MastersSubmitted) {
        searchFile = "master.flac";
    } else if (task.name === ReleaseTaskName.ArtworkCreation) {
        searchFile = "artwork.png";
    }

    const fileInfo = await getFileInfo(
        searchFolder,
        searchFile,
        authToken,
    );

    if (!fileInfo) {
        return { status: CompletionStatus.TODO, color: getCompletionStatusColor(CompletionStatus.TODO) };
    }

    const status = CompletionStatus.DONE;

    return {
        status,
        color: getCompletionStatusColor(status),
        fileInfo,
    };
};