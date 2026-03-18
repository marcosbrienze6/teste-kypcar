function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export class ReservationWindowPolicy {
  constructor({ startOffsetDays, durationDays, maxAttempts }) {
    this.startOffsetDays = startOffsetDays;
    this.durationDays = durationDays;
    this.maxAttempts = maxAttempts;
  }

  buildWindow(baseDate, attempt) {
    const start = addDays(baseDate, this.startOffsetDays + attempt);
    const end = addDays(start, this.durationDays);

    return {
      startDate: toDateOnly(start),
      endDate: toDateOnly(end),
    };
  }
}
