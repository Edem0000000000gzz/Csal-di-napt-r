import React from 'react';
import { FamilyMemberId } from '../types';
import { FAMILY_MEMBERS, getMemberName, getMemberInitial } from '../data/defaultData';
import { Users } from 'lucide-react';

interface MemberFilterBarProps {
  selectedMember: FamilyMemberId;
  onSelectMember: (id: FamilyMemberId) => void;
  eventCounts?: Record<FamilyMemberId, number>;
  memberNames?: Record<string, string>;
}

export const MemberFilterBar: React.FC<MemberFilterBarProps> = ({
  selectedMember,
  onSelectMember,
  eventCounts = {} as Record<FamilyMemberId, number>,
  memberNames,
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-3 pt-2">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 px-3 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-lg">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 hidden sm:inline shrink-0">
          Szűrés:
        </span>

        {/* All / Mindenki */}
        <button
          id="filter-member-all"
          onClick={() => onSelectMember('all')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
            selectedMember === 'all'
              ? 'bg-slate-700 text-white border border-slate-600 shadow-sm'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
          }`}
        >
          <div className="w-5 h-5 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200">
            <Users className="w-3 h-3" />
          </div>
          <span>{getMemberName('all', memberNames)}</span>
          {eventCounts['all'] !== undefined && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-md text-[10px] bg-slate-800 text-slate-300 font-bold border border-slate-700">
              {eventCounts['all']}
            </span>
          )}
        </button>

        {/* Family members */}
        {FAMILY_MEMBERS.map((member) => {
          const isSelected = selectedMember === member.id;
          const count = eventCounts[member.id] || 0;
          const currentName = getMemberName(member.id, memberNames);
          const initial = getMemberInitial(member.id, memberNames);

          return (
            <button
              key={member.id}
              id={`filter-member-${member.id}`}
              onClick={() => onSelectMember(member.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'text-white shadow-md border ring-2 ring-offset-1 ring-offset-slate-900'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
              }`}
              style={{
                backgroundColor: isSelected ? member.color : undefined,
                borderColor: isSelected ? member.color : undefined,
              }}
            >
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                  isSelected ? 'bg-white/25 text-white' : 'text-white'
                }`}
                style={{ backgroundColor: !isSelected ? member.color : undefined }}
              >
                {initial}
              </div>
              <span>{currentName}</span>
              {member.role === 'szulo' && (
                <span className="text-[10px] opacity-80 font-normal hidden md:inline">
                  ({member.id === 'apa' ? '07-15' : '12h'})
                </span>
              )}
              {count > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                    isSelected
                      ? 'bg-black/30 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
