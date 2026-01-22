// Helper function to calculate difference in days between two dates
export function getDifferenceInDays(
    date1: Date | string,
    date2: Date | string
): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    // Reset hours, minutes, seconds, and milliseconds to zero
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Human readable relative time like "6 months ago"
export function formatTimeAgo(date: Date | string | null | undefined): string {
    if (!date) return "—";
    const d = new Date(date);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (isNaN(seconds)) return "—";

    const intervals: { label: string; seconds: number }[] = [
        { label: "year", seconds: 31536000 },
        { label: "month", seconds: 2592000 },
        { label: "week", seconds: 604800 },
        { label: "day", seconds: 86400 },
        { label: "hour", seconds: 3600 },
        { label: "minute", seconds: 60 },
        { label: "second", seconds: 1 },
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            if (interval.label === "second" && count < 30) return "just now";
            return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
        }
    }
    return "just now";
}