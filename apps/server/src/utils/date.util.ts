export function formatDateLabel(date: string): string {
  return date.replaceAll('-', '.');
}

export function isDateBefore(left: string, right: string): boolean {
  return new Date(`${left}T00:00:00.000Z`) < new Date(`${right}T00:00:00.000Z`);
}
