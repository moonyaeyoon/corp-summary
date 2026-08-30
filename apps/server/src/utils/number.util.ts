export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

export function toMillionKrw(value: string | number | null | undefined): number {
  return Math.round(toNumber(value) / 1_000_000);
}
