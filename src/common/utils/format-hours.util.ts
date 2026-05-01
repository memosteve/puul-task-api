export function formatHours(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}
