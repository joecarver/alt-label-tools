import { Text, Flex, Badge, Card } from "@radix-ui/themes";
import { type ReleaseTask } from "@/types/ReleaseTask";
import { CompletionStatus } from "@/types/CompletionStatus";
import { DueDateStatus } from "@/types/DueDateStatus";
import { formatDateRange } from "../utils/date";
import { ClockIcon } from "@radix-ui/react-icons";

import { getDueDateStatusColor } from "../utils/getStatusColor";
import { DriveLinkButton } from "./DriveLinkButton";
import { useState } from "react";
import styles from "./TaskItem.module.css";
import { TaskItemCompletionStatus } from "./TaskItemCompletionStatus";

interface Props {
  task: ReleaseTask;
  releaseId: string;
}

export function TaskItem({ task: initialTask, releaseId }: Props) {
  const [task, setTask] = useState(initialTask);
  const [isLoading, setIsLoading] = useState(false);

  const handleTaskCompletion = async () => {
    const taskId = task.id;
    const completedAt = task.completedAt;
    let newCompletedAt: string | undefined;

    if (completedAt) {
      newCompletedAt = undefined;
    } else {
      newCompletedAt = new Date().toISOString();
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("taskId", taskId);
    formData.append("completedAt", newCompletedAt || "");
    formData.append("redirectTo", window.location.pathname);

    try {
      const response = await fetch("/api/update-task-completion", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to update task completion");
      }

      // Refresh the task data
      const updatedTaskResponse = await fetch(`/api/tasks/${taskId}`);
      const updatedTask = await updatedTaskResponse.json();
      setTask(updatedTask);
    } catch (error) {
      console.error("Failed to update task completion:", error);
      alert("Failed to update task completion. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isCompleted =
    task.taskStatus?.completionStatus === CompletionStatus.DONE_DETECTED ||
    task.taskStatus?.completionStatus === CompletionStatus.DONE_MANUALLY;

  const isOverdue =
    task.taskStatus?.dueDateStatus === DueDateStatus.OVERDUE && !isCompleted;

  const taskClass = isCompleted
    ? styles.taskItemCompleted
    : isOverdue
    ? styles.taskItemOverdue
    : styles.taskItemNotCompleted;

  return (
    <Card className={`${styles.taskItem} ${taskClass}`}>
      <Flex direction="column" gap="1">
        <Flex gap="2" align="center" justify="between">
          <Text weight="medium">{task.name}</Text>
        </Flex>
        <Flex gap="1" wrap="wrap">
          <Badge
            size="2"
            color={getDueDateStatusColor(
              task.taskStatus?.dueDateStatus || undefined
            )}
            variant="soft"
          >
            <ClockIcon />
            Due: {formatDateRange(task.startDate || "", task.endDate || "")}
          </Badge>
          <TaskItemCompletionStatus
            task={task}
            isDetectable={task.isDetectable ?? false}
            taskStatus={task.taskStatus ?? undefined}
            isLoading={isLoading}
            onToggle={handleTaskCompletion}
          />
          {task.taskStatus?.completionStatus ===
            CompletionStatus.DONE_DETECTED &&
            task.taskStatus?.fileInfo?.webViewLink && (
              <DriveLinkButton
                url={task.taskStatus.fileInfo.webViewLink}
                fileName={task.taskStatus.fileInfo.name}
              />
            )}
        </Flex>
      </Flex>
    </Card>
  );
}
