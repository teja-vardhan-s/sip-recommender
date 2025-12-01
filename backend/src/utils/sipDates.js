export function getNextSipDate(startDate, frequency = "MONTHLY") {
    const start = new Date(startDate);
    const now = new Date();

    if (frequency !== "MONTHLY") {
        throw new Error("Only monthly SIPs supported");
    }

    let next = new Date(start);
    next.setMonth(start.getMonth());

    // Move forward until next >= today
    while (next < now) {
        next.setMonth(next.getMonth() + 1);
    }

    return next;
}
