export function formatDateLabel(date: string): string {
  return date.replaceAll('-', '.');
}

export function isDateBefore(left: string, right: string): boolean {
  return new Date(`${left}T00:00:00.000Z`) < new Date(`${right}T00:00:00.000Z`);
}

export function getNextDate(date: string): string {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  return nextDate.toISOString().slice(0, 10);
}
