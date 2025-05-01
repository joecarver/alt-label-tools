import { format, isSameDay, parseISO } from "date-fns";

export const formatDateRange = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) {
        return "";
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (isSameDay(start, end)) {
        return format(start, "MMM d, yyyy");
    }

    return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
};

export const formatSingleDate = (date: string) => {
    if (!date) {
        return "";
    }

    return format(parseISO(date), "MMM d, yyyy");
};
