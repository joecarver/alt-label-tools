import { Button } from "@radix-ui/themes";
import { CheckIcon, Cross2Icon } from "@radix-ui/react-icons";
import { formatSingleDate } from "@/utils/date";
import { useState } from "react";

interface Props {
    taskId: string;
    completedAt?: string;
    releaseId: string;
}

export function TaskCompletionButton({ taskId, completedAt, releaseId }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [isCompleted, setIsCompleted] = useState(!!completedAt);
    const [completionDate, setCompletionDate] = useState(completedAt);
    const [isHovering, setIsHovering] = useState(false);

    const handleToggle = async () => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('taskId', taskId);
        formData.append('completedAt', isCompleted ? '' : new Date().toISOString());
        formData.append('redirectTo', window.location.pathname);

        try {
            const response = await fetch('/api/update-task-completion', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to update task completion');
            }

            setIsCompleted(!isCompleted);
            setCompletionDate(isCompleted ? undefined : new Date().toISOString());

            // Trigger update event
            const event = new CustomEvent("taskCompletionUpdated", {
                bubbles: true,
                composed: true,
                detail: {
                    taskId,
                    releaseId,
                },
            });
            document.body.dispatchEvent(event);
        } catch (error) {
            console.error('Failed to update task completion:', error);
            alert('Failed to update task completion. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isCompleted) {
        return (
            <Button
                type="button"
                size="1"
                color={isHovering ? "red" : "green"}
                variant="soft"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onClick={handleToggle}
                style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
                disabled={isLoading}
                loading={isLoading}
            >
                {isHovering ? <Cross2Icon /> : <CheckIcon />}
                {`Completed: ${formatSingleDate(completionDate!)} (manually)`}
            </Button>
        );
    }

    return (
        <Button
            type="button"
            size="1"
            variant="outline"
            color="green"
            onClick={handleToggle}
            disabled={isLoading}
            loading={isLoading}
            style={{
                cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
        >
            <CheckIcon /> Mark as Complete
        </Button>
    );
} 