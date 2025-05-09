import { BadgeColor } from "@/types/BadgeColor";
import { CompletionStatus } from "@/types/CompletionStatus";
import { ReleaseTaskName, type ReleaseTask } from "@/types/ReleaseTask";

export const getTaskSummary = (tasks: ReleaseTask[]) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
        (task) =>
            task.taskStatus.completionStatus === CompletionStatus.DONE_DETECTED ||
            task.taskStatus.completionStatus === CompletionStatus.DONE_MANUALLY,
    ).length;

    const releaseDate = tasks.find(
        (task) => task.name === ReleaseTaskName.ReleaseDate,
    )?.startDate;

    return {
        totalTasks,
        completedTasks,
        color:
            completedTasks === totalTasks
                ? BadgeColor.GREEN
                : completedTasks > totalTasks / 2
                    ? BadgeColor.YELLOW
                    : completedTasks > 0
                        ? BadgeColor.ORANGE
                        : BadgeColor.RED,
        releaseDate,
    };
};