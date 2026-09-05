import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalendarEvent, ParentShift } from '../types';
import { FAMILY_MEMBERS, CATEGORIES } from '../data/defaultData';
import {
  formatToHungarianDate,
  getWeekDays,
  HUNGARIAN_MONTHS,
  formatIso,
} from './dateUtils';

export function exportWeeklyPdf(
  weekStartMonday: Date,
  events: CalendarEvent[],
  shifts: ParentShift[]
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const weekDays = getWeekDays(weekStartMonday);
  const startStr = formatIso(weekDays[0].date);
  const endStr = formatIso(weekDays[6].date);

  // Header styling
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text('Családi Heti Naptár & Munkabeosztás', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Időszak: ${startStr} - ${endStr}`, 14, 23);

  // Section 1: Parents Work Shift summary table for the week
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('1. Szülői Munkaidő', 14, 32);

  const shiftRows = weekDays.map((day) => {
    const apaShift = shifts.find((s) => s.date === day.iso && s.memberId === 'apa');
    const anyaShift = shifts.find((s) => s.date === day.iso && s.memberId === 'anya');

    const apaText = apaShift
      ? apaShift.isOffDay
        ? 'Szabadnap'
        : `${apaShift.startTime || '07:00'} - ${apaShift.endTime || '15:00'} (${apaShift.shiftType || 'Munkanap'})`
      : 'Nincs rögzítve';

    const anyaText = anyaShift
      ? anyaShift.isOffDay
        ? 'Szabadnap / Pihenő'
        : `${anyaShift.startTime || '06:00'} - ${anyaShift.endTime || '18:00'} (${anyaShift.shiftType || 'Munkanap'})`
      : 'Nincs rögzítve';

    return [
      `${day.dayName} (${day.dayNumber}.)`,
      day.iso,
      apaText,
      anyaText,
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [['Nap', 'Dátum', 'Apa (07:00 - 15:00)', 'Anya (06:00 - 18:00)']],
    body: shiftRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 26 },
      2: { cellWidth: 105 },
      3: { cellWidth: 105 },
    },
  });

  // Section 2: Family Events table for the week
  // @ts-expect-error - jspdf autotable adds lastAutoTable to doc
  const lastY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 90;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Családi Események & Teendők', 14, lastY + 10);

  const weekIsos = new Set(weekDays.map((d) => d.iso));
  const weekEvents = events
    .filter((e) => weekIsos.has(e.date))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });

  const eventRows = weekEvents.length > 0
    ? weekEvents.map((e) => {
        const day = weekDays.find((d) => d.iso === e.date);
        const member = FAMILY_MEMBERS.find((m) => m.id === e.memberId);
        const memberName = e.memberId === 'all' ? 'Egész család' : member ? member.name : e.memberId;
        const cat = CATEGORIES[e.category]?.name || 'Egyéb';
        const timeStr = e.isAllDay ? 'Egész nap' : `${e.startTime || ''} - ${e.endTime || ''}`;

        return [
          `${day ? day.dayName : ''} (${e.date})`,
          timeStr,
          memberName,
          cat,
          e.title,
          e.location || e.notes || '-',
        ];
      })
    : [['-', '-', '-', '-', 'Nincs rögzített esemény ezen a héten', '-']];

  autoTable(doc, {
    startY: lastY + 13,
    head: [['Nap & Dátum', 'Időpont', 'Családtag', 'Kategória', 'Esemény megnevezése', 'Helyszín / Jegyzet']],
    body: eventRows,
    theme: 'striped',
    headStyles: {
      fillColor: [14, 116, 144], // Cyan/Teal-700
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
  });

  // Footer note
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Készült a Családi Naptár alkalmazással • Nyomtatva: ${new Date().toLocaleDateString('hu-HU')} • Oldal ${i} / ${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 6
    );
  }

  doc.save(`Csaladi_Heti_Naptar_${startStr}.pdf`);
}

export function exportMonthlyPdf(
  year: number,
  monthIndex: number,
  events: CalendarEvent[],
  shifts: ParentShift[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const monthName = HUNGARIAN_MONTHS[monthIndex];

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(`Családi Havi Naptár – ${year}. ${monthName}`, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Apa (07:00-15:00) és Anya (06:00-18:00) munkanapjai, valamint a család eseményei összesítve.', 14, 25);

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const rows = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const currDate = new Date(year, monthIndex, d);
    const dateStr = formatIso(currDate);
    const dayOfWeek = currDate.toLocaleDateString('hu-HU', { weekday: 'short' });

    // Apa & Anya shifts
    const apaShift = shifts.find((s) => s.date === dateStr && s.memberId === 'apa');
    const anyaShift = shifts.find((s) => s.date === dateStr && s.memberId === 'anya');

    const apaStr = apaShift
      ? apaShift.isOffDay ? 'Szabadnap' : `${apaShift.startTime || '07:00'}-${apaShift.endTime || '15:00'}`
      : '-';

    const anyaStr = anyaShift
      ? anyaShift.isOffDay ? 'Szabadnap' : `${anyaShift.startTime || '06:00'}-${anyaShift.endTime || '18:00'}`
      : '-';

    // Day events
    const dayEvents = events.filter((e) => e.date === dateStr);
    const eventsSummary = dayEvents.length > 0
      ? dayEvents.map((e) => {
          const m = FAMILY_MEMBERS.find((f) => f.id === e.memberId);
          const name = e.memberId === 'all' ? 'Család' : m?.name || '';
          return `• [${name}] ${e.title} (${e.isAllDay ? 'Egész nap' : e.startTime || ''})`;
        }).join('\n')
      : '-';

    rows.push([
      `${d}. (${dayOfWeek})`,
      apaStr,
      anyaStr,
      eventsSummary,
    ]);
  }

  autoTable(doc, {
    startY: 30,
    head: [['Nap', 'Apa (07-15)', 'Anya (06-18)', 'Családi és egyéni események']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 32 },
      2: { cellWidth: 32 },
      3: { cellWidth: 98 },
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Családi Naptár & Munkabeosztás • Export: ${new Date().toLocaleDateString('hu-HU')} • Oldal ${i} / ${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 8
    );
  }

  doc.save(`Csaladi_Havi_Naptar_${year}_${monthIndex + 1}.pdf`);
}
