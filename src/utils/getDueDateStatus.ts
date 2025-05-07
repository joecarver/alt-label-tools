
import { DueDateStatus } from "@/types/DueDateStatus";
import { parseISO } from "date-fns";

export const getDueDateStatus = (endDate: string, isCompleted: boolean): DueDateStatus | null => {
    if (isCompleted) {
        return null;
    }

    const today = new Date();
    const dueDate = parseISO(endDate);
    const daysUntilDue = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilDue < 0) {
        return DueDateStatus.OVERDUE;
    } else if (daysUntilDue <= 3) {
        return DueDateStatus.DUE;
    }
    return DueDateStatus.UNKNOWN;
};