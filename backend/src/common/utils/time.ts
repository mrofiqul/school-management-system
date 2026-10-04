/** Converts "HH:mm" to a Date Prisma can write to a @db.Time column. */
export function timeStringToDate(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

/** Converts a @db.Time column's Date back to "HH:mm" for API responses. */
export function dateToTimeString(date: Date): string {
  return date.toISOString().slice(11, 16);
}
