export const HUNGARIAN_DAYS = [
  'Vasárnap',
  'Hétfő',
  'Kedd',
  'Szerda',
  'Csütörtök',
  'Péntek',
  'Szombat',
];

export const HUNGARIAN_DAYS_SHORT = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
// Monday first standard order
export const HUNGARIAN_DAYS_MON_FIRST = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
export const HUNGARIAN_DAYS_FULL_MON_FIRST = [
  'Hétfő',
  'Kedd',
  'Szerda',
  'Csütörtök',
  'Péntek',
  'Szombat',
  'Vasárnap',
];

export const HUNGARIAN_MONTHS = [
  'Január',
  'Február',
  'Március',
  'Április',
  'Május',
  'Június',
  'Július',
  'Augusztus',
  'Szeptember',
  'Október',
  'November',
  'December',
];

export function parseIsoDate(isoStr: string): Date {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // safe noon time
}

export function formatToHungarianDate(isoStr: string): string {
  const d = parseIsoDate(isoStr);
  const dayName = HUNGARIAN_DAYS[d.getDay()];
  const monthName = HUNGARIAN_MONTHS[d.getMonth()];
  return `${d.getFullYear()}. ${monthName} ${d.getDate()}., ${dayName}`;
}

export function formatDayShort(isoStr: string): string {
  const d = parseIsoDate(isoStr);
  const dayName = HUNGARIAN_DAYS[d.getDay()];
  return `${d.getDate()}. (${dayName.slice(0, 2)})`;
}

export function getMondayOfCurrentWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // day: 0 = Sun, 1 = Mon ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getWeekDays(startMonday: Date): { date: Date; iso: string; dayName: string; dayNumber: number }[] {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(startMonday);
    current.setDate(startMonday.getDate() + i);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    days.push({
      date: current,
      iso,
      dayName: HUNGARIAN_DAYS_FULL_MON_FIRST[i],
      dayNumber: current.getDate(),
    });
  }
  return days;
}

export function getMonthCalendarGrid(year: number, monthIndex: number): {
  date: Date;
  iso: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

  // Monday = 1, ..., Sunday = 0 (we want Monday = 0, Sunday = 6)
  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;

  const todayStr = getTodayIso();
  const grid = [];

  // Previous month filler days
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDate = new Date(year, monthIndex - 1, prevMonthLastDay - i);
    const iso = formatIso(prevDate);
    grid.push({
      date: prevDate,
      iso,
      dayNumber: prevDate.getDate(),
      isCurrentMonth: false,
      isToday: iso === todayStr,
    });
  }

  // Current month days
  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const currDate = new Date(year, monthIndex, d);
    const iso = formatIso(currDate);
    grid.push({
      date: currDate,
      iso,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: iso === todayStr,
    });
  }

  // Next month filler days (fill up to 35 or 42 grid cells)
  const remainingDays = (7 - (grid.length % 7)) % 7;
  for (let i = 1; i <= remainingDays; i++) {
    const nextDate = new Date(year, monthIndex + 1, i);
    const iso = formatIso(nextDate);
    grid.push({
      date: nextDate,
      iso,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: iso === todayStr,
    });
  }

  return grid;
}

export function formatIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayIso(): string {
  return formatIso(new Date());
}

export function isSameDay(iso1: string, iso2: string): boolean {
  return iso1 === iso2;
}
