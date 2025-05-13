import { ReleaseTaskName } from "frontend/src/types/ReleaseTask";

export const isDetectableTask = (taskName: string) => {
    return [
        ReleaseTaskName.ContractCreated,
        ReleaseTaskName.PreMastersSubmitted,
        ReleaseTaskName.MastersSubmitted,
        ReleaseTaskName.ArtworkCreation,
    ].includes(taskName as ReleaseTaskName);
};
