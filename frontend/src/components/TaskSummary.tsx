import { Badge, Flex } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { type ReleaseTask } from "@/types/ReleaseTask";
import { BadgeColor } from "@/types/BadgeColor";
import { getTaskSummary } from "../utils/getTaskSummary";
import { LuListTree } from "react-icons/lu";

interface TaskSummaryData {
  completedTasks: number;
  totalTasks: number;
  color: BadgeColor;
  releaseDate?: string | null;
}

interface Props {
  releaseId: string;
  initialTasks: ReleaseTask[];
}

export function TaskSummary({ releaseId, initialTasks }: Props) {
  const [taskSummary, setTaskSummary] = useState<TaskSummaryData>(
    getTaskSummary(initialTasks)
  );

  useEffect(() => {
    const handleTaskCompletion = async (event: Event) => {
      const customEvent = event as CustomEvent<{ releaseId?: string }>;
      if (customEvent.detail?.releaseId === releaseId) {
        try {
          const response = await fetch(
            `/api/task-summary?releaseId=${releaseId}`
          );
          const data = await response.json();
          setTaskSummary(data);
        } catch (error) {
          console.error("Error fetching task summary:", error);
        }
      }
    };

    document.body.addEventListener(
      "taskCompletionUpdated",
      handleTaskCompletion
    );
    return () => {
      document.body.removeEventListener(
        "taskCompletionUpdated",
        handleTaskCompletion
      );
    };
  }, [releaseId]);

  return (
    <div id={`task-summary-${releaseId}`} data-release-id={releaseId}>
      <Flex gap="2">
        <Badge size="2" color={taskSummary.color} variant="soft">
          <LuListTree size={16} />
          {taskSummary.completedTasks} / {taskSummary.totalTasks} tasks
          completed
        </Badge>
      </Flex>
    </div>
  );
}
