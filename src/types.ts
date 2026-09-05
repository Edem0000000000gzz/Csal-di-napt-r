export type FamilyMemberId = 'apa' | 'anya' | 'amira' | 'donat' | 'hella' | 'all';

export type MemberNamesMap = Record<FamilyMemberId, string>;

export interface FamilyMember {
  id: FamilyMemberId;
  name: string;
  role: 'szulo' | 'gyerek' | 'csalad';
  color: string; // Hex or tailwind color
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeClass: string;
  avatarInitial: string;
  avatarBg: string;
  standardShift?: string;
  description: string;
}

export type EventCategory = 
  | 'work'       // Munka / Munkaidő
  | 'school'     // Iskola / Óvoda
  | 'activity'   // Különóra / Sport
  | 'health'     // Orvos / Egészség
  | 'family'     // Családi program
  | 'task'       // Teendő / Bevásárlás
  | 'other';     // Egyéb

export interface CategoryInfo {
  id: EventCategory;
  name: string;
  iconName: string;
  color: string;
  badgeClass: string;
  borderClass: string;
}

export type ReminderTime = 
  | 'none'
  | 'at_time'       // Az esemény kezdetekor
  | '15_min'        // 15 perccel előtte
  | '30_min'        // 30 perccel előtte
  | '1_hour'        // 1 órával előtte
  | '2_hours'       // 2 órával előtte
  | '1_day'         // 1 nappal előtte
  | 'custom';       // Egyedi időpont

export interface CalendarEvent {
  id: string;
  title: string;
  memberId: FamilyMemberId;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isAllDay: boolean;
  location?: string;
  notes?: string;
  reminder: ReminderTime;
  customReminderDateTime?: string; // YYYY-MM-DDTHH:mm
  isCompleted?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface ParentShift {
  id: string;
  memberId: 'apa' | 'anya';
  date: string; // YYYY-MM-DD
  shiftType: string; // e.g. "07:00 - 15:00", "06:00 - 18:00", "18:00 - 06:00", "Szabadnap", "Egyedi"
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isOffDay?: boolean;
  note?: string;
  updatedAt?: number;
}

export type CalendarViewMode = 'week' | 'month' | 'matrix' | 'agenda';
