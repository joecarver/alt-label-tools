import { Badge } from "@radix-ui/themes";
import { CheckIcon } from "@radix-ui/react-icons";
import { formatSingleDate } from "../utils/date";
import { TaskCompletionButton } from "./TaskCompletionButton";
import { CompletionStatus } from "../types/CompletionStatus";
import { type ReleaseTask } from "../types/ReleaseTask";
import { type TaskStatus } from "../types/TaskCompletionStatus";

interface TaskItemCompletionStatusProps {
  task: ReleaseTask;
  isDetectable: boolean;
  taskStatus?: TaskStatus;
  onToggle: () => void;
  isLoading: boolean;
}

export const TaskItemCompletionStatus = ({
  task,
  isDetectable,
  taskStatus,
  onToggle,
  isLoading,
}: TaskItemCompletionStatusProps) => {
  if (isDetectable) {
    return taskStatus?.fileInfo?.createdTime ? (
      <Badge size="2" color="green" variant="soft">
        <CheckIcon />
        Completed: {formatSingleDate(taskStatus.fileInfo.createdTime)}
      </Badge>
    ) : null;
  }

  return (
    <div>
      <TaskCompletionButton
        isCompleted={
          taskStatus?.completionStatus === CompletionStatus.DONE_MANUALLY
        }
        completedAt={
          taskStatus?.completionStatus === CompletionStatus.DONE_MANUALLY
            ? task.completedAt || undefined
            : undefined
        }
        onToggle={onToggle}
        isLoading={isLoading}
      />
    </div>
  );
};
