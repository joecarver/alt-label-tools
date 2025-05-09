import { Badge } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { formatSingleDate } from "@/utils/date";
import { type ReleaseTask } from "@/types/ReleaseTask";
import { getTaskSummary } from "@/utils/getTaskSummary";

type BadgeColor = "green" | "yellow" | "ruby" | "gray" | "gold" | "bronze" | "brown" | "amber" | "orange" | "tomato" | "red" | "crimson" | "pink" | "plum" | "purple" | "violet" | "iris" | "indigo" | "blue" | "cyan" | "teal" | "jade" | "grass" | "mint" | "lime" | "sky";

interface TaskSummaryData {
    completedTasks: number;
    totalTasks: number;
    color: BadgeColor;
    releaseDate?: string;
}

interface Props {
    releaseId: string;
    clientName: string;
    catalogNumber: string;
    initialTasks: ReleaseTask[];
}

export function TaskSummary({ releaseId, clientName, catalogNumber, initialTasks }: Props) {
    const [taskSummary, setTaskSummary] = useState<TaskSummaryData>(getTaskSummary(initialTasks));

    useEffect(() => {
        const handleTaskCompletion = async (event: Event) => {
            const customEvent = event as CustomEvent<{ releaseId?: string }>;
            if (customEvent.detail?.releaseId === releaseId) {
                try {
                    const response = await fetch(
                        `/api/task-summary?releaseId=${releaseId}&taskIds=${initialTasks.map((task) => task.id).join(";")}&clientName=${clientName}&catalogNumber=${catalogNumber}`
                    );
                    const data = await response.json();
                    setTaskSummary(data);
                } catch (error) {
                    console.error("Error fetching task summary:", error);
                }
            }
        };

        document.body.addEventListener("taskCompletionUpdated", handleTaskCompletion);
        return () => {
            document.body.removeEventListener("taskCompletionUpdated", handleTaskCompletion);
        };
    }, [releaseId, clientName, catalogNumber]);

    return (
        <div id={`task-summary-${releaseId}`} data-release-id={releaseId}>
            <Badge size="2" color={taskSummary.color} variant="soft">
                {taskSummary.completedTasks} / {taskSummary.totalTasks} tasks completed
            </Badge>

            <Badge size="2" color="blue" variant="soft">
                Release Date: {taskSummary.releaseDate ? formatSingleDate(taskSummary.releaseDate) : "TBD"}
            </Badge>
        </div>
    );
} 