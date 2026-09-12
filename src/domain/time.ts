export interface NormalizedTime {
  dayOffset: number;
  hours: number;
  minutes: number;
  display: string;
}

export function normalizeOperationalTime(value: string): NormalizedTime {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error(`Invalid operational time: ${value}`);

  const rawHours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59) throw new Error(`Invalid operational time: ${value}`);

  const dayOffset = Math.floor(rawHours / 24);
  const hours = rawHours % 24;
  const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return {
    dayOffset,
    hours,
    minutes,
    display: dayOffset ? `${clock} (+${dayOffset})` : clock,
  };
}
