export interface TermOption {
  id: string;
  name: string;
  sequence?: number;
  academicYearId?: string;
  academicYear?: { id: string; name: string } | null;
}

/** The "Yearly" term only holds annual report cards: no exams, timetable or marks go in it. */
export function isYearlyTerm(term: { sequence?: number; name: string }) {
  return (term.sequence ?? 0) >= 4 || /\b(yearly|year\s*end|annual)\b/i.test(term.name);
}

/** "Term 1", or "Term 1 (2026/2027)" when the list holds terms of several years. */
export function termLabel(term: TermOption, all: TermOption[]) {
  const years = new Set(all.map((t) => t.academicYearId ?? t.academicYear?.id));
  return years.size > 1 && term.academicYear?.name ? `${term.name} (${term.academicYear.name})` : term.name;
}
