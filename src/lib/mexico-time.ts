const MEXICO_CITY_TIME_ZONE = "America/Mexico_City";

export function parseMexicoCityDateTime(value: string | Date | null | undefined) {
  if (!value) return new Date();
  if (value instanceof Date) return value;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return new Date(value);

  const [, year, month, day, hour, minute, second = "00"] = match;
  const requestedUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const candidate = new Date(requestedUtc);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_CITY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    hour12: false,
  }).formatToParts(candidate);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const displayedUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return new Date(requestedUtc + (requestedUtc - displayedUtc));
}
