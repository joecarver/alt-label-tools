import { format, isSameDay, parseISO } from "date-fns";

const DATE_FORMAT = "dd/MM/yyyy";

export const formatDateRange = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) {
        return "";
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (isSameDay(start, end)) {
        return format(start, DATE_FORMAT);
    }

    return `${format(start, DATE_FORMAT)} - ${format(end, DATE_FORMAT)}`;
};

export const formatSingleDate = (date: string) => {
    if (!date) {
        return "";
    }

    return format(parseISO(date), DATE_FORMAT);
};
