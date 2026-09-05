import { FamilyMember, CategoryInfo, FamilyMemberId } from '../types';

export const FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'apa',
    name: 'Apa',
    role: 'szulo',
    color: '#3b82f6',
    bgClass: 'bg-blue-950/40',
    textClass: 'text-blue-300',
    borderClass: 'border-blue-500/30',
    badgeClass: 'bg-blue-900/60 text-blue-200 border-blue-700/50',
    avatarInitial: 'A',
    avatarBg: 'bg-blue-600',
    description: 'Műszakos beosztás',
  },
  {
    id: 'anya',
    name: 'Anya',
    role: 'szulo',
    color: '#ec4899',
    bgClass: 'bg-pink-950/40',
    textClass: 'text-pink-300',
    borderClass: 'border-pink-500/30',
    badgeClass: 'bg-pink-900/60 text-pink-200 border-pink-700/50',
    avatarInitial: 'A',
    avatarBg: 'bg-pink-600',
    description: 'Műszakos beosztás',
  },
  {
    id: 'amira',
    name: 'Amira',
    role: 'gyerek',
    color: '#8b5cf6',
    bgClass: 'bg-purple-950/40',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-500/30',
    badgeClass: 'bg-purple-900/60 text-purple-200 border-purple-700/50',
    avatarInitial: 'A',
    avatarBg: 'bg-purple-600',
    description: 'Iskola, különórák',
  },
  {
    id: 'donat',
    name: 'Donát',
    role: 'gyerek',
    color: '#10b981',
    bgClass: 'bg-emerald-950/40',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/30',
    badgeClass: 'bg-emerald-900/60 text-emerald-200 border-emerald-700/50',
    avatarInitial: 'D',
    avatarBg: 'bg-emerald-600',
    description: 'Óvoda, edzés',
  },
  {
    id: 'hella',
    name: 'Hella',
    role: 'gyerek',
    color: '#f59e0b',
    bgClass: 'bg-amber-950/40',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-500/30',
    badgeClass: 'bg-amber-900/60 text-amber-200 border-amber-700/50',
    avatarInitial: 'H',
    avatarBg: 'bg-amber-600',
    description: 'Bölcsi, babaúszás',
  },
];

const baseCategories: CategoryInfo[] = [
  { id: 'family', name: 'Családi program', iconName: 'Heart', color: '#ec4899', badgeClass: 'bg-pink-900/50 text-pink-300 border-pink-700/40', borderClass: 'border-pink-500/30' },
  { id: 'work', name: 'Munka / Műszak', iconName: 'Briefcase', color: '#3b82f6', badgeClass: 'bg-blue-900/50 text-blue-300 border-blue-700/40', borderClass: 'border-blue-500/30' },
  { id: 'school', name: 'Iskola / Óvoda', iconName: 'GraduationCap', color: '#8b5cf6', badgeClass: 'bg-purple-900/50 text-purple-300 border-purple-700/40', borderClass: 'border-purple-500/30' },
  { id: 'activity', name: 'Különóra / Sport', iconName: 'Activity', color: '#10b981', badgeClass: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40', borderClass: 'border-emerald-500/30' },
  { id: 'health', name: 'Orvos / Egészség', iconName: 'Stethoscope', color: '#ef4444', badgeClass: 'bg-rose-900/50 text-rose-300 border-rose-700/40', borderClass: 'border-rose-500/30' },
  { id: 'task', name: 'Teendő / Bevásárlás', iconName: 'CheckSquare', color: '#f59e0b', badgeClass: 'bg-amber-900/50 text-amber-300 border-amber-700/40', borderClass: 'border-amber-500/30' },
  { id: 'other', name: 'Egyéb', iconName: 'Calendar', color: '#64748b', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700', borderClass: 'border-slate-600' },
];

const catRecord: Record<string, CategoryInfo> = {};
for (const c of baseCategories) {
  catRecord[c.id] = c;
}

export type CategoryList = CategoryInfo[] & Record<string, CategoryInfo>;
export const CATEGORIES: CategoryList = Object.assign([...baseCategories], catRecord);

export const APA_SHIFT_PRESETS = [
  { label: 'Délelőtt (06:00 - 14:00)', startTime: '06:00', endTime: '14:00', isOffDay: false },
  { label: 'Délután (14:00 - 22:00)', startTime: '14:00', endTime: '22:00', isOffDay: false },
  { label: 'Éjszaka (22:00 - 06:00)', startTime: '22:00', endTime: '06:00', isOffDay: false },
  { label: 'Nappalos 12 órás (06:00 - 18:00)', startTime: '06:00', endTime: '18:00', isOffDay: false },
  { label: 'Éjszakás 12 órás (18:00 - 06:00)', startTime: '18:00', endTime: '06:00', isOffDay: false },
  { label: 'Szabadnap', startTime: '', endTime: '', isOffDay: true },
];

export const ANYA_SHIFT_PRESETS = [
  { label: 'Normál munkaidő (08:00 - 16:30)', startTime: '08:00', endTime: '16:30', isOffDay: false },
  { label: 'Rövid nap (08:00 - 14:00)', startTime: '08:00', endTime: '14:00', isOffDay: false },
  { label: 'Home office (08:30 - 17:00)', startTime: '08:30', endTime: '17:00', isOffDay: false },
  { label: 'Szabadnap', startTime: '', endTime: '', isOffDay: true },
];

export function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMemberName(
  memberId: FamilyMemberId | string,
  customNames?: Record<string, string>,
  fallbackToDefault: boolean = true
): string {
  if (memberId === 'all') return 'Mindenki';
  if (customNames && customNames[memberId]) {
    return customNames[memberId];
  }
  const defaultNames: Record<string, string> = {
    apa: 'Apa',
    anya: 'Anya',
    amira: 'Amira',
    donat: 'Donát',
    hella: 'Hella',
  };
  if (defaultNames[memberId]) {
    return defaultNames[memberId];
  }
  return fallbackToDefault ? memberId : '';
}

export function getMemberInitial(
  memberId: FamilyMemberId | string,
  customNames?: Record<string, string>
): string {
  if (memberId === 'all') return '★';
  const name = getMemberName(memberId, customNames);
  return name ? name.charAt(0).toUpperCase() : '?';
}
