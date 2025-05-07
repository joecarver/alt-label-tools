
import { getDueDateStatusColor } from "@/utils/getStatusColor";
import { DueDateStatus } from "@/types/DueDateStatus";
import { parseISO } from "date-fns";

export const getDueDateStatus = (endDate: string, isCompleted: boolean) => {
    if (isCompleted) {
        return null;
    }

    const today = new Date();
    const dueDate = parseISO(endDate);
    const daysUntilDue = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilDue < 0) {
        return { status: DueDateStatus.OVERDUE, color: getDueDateStatusColor(DueDateStatus.OVERDUE) };
    } else if (daysUntilDue <= 3) {
        return { status: DueDateStatus.DUE, color: getDueDateStatusColor(DueDateStatus.DUE) };
    }
    return { status: DueDateStatus.UNKNOWN, color: getDueDateStatusColor(DueDateStatus.UNKNOWN) };
};