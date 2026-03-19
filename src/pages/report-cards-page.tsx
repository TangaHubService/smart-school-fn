import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  downloadStudentReportCardPdfApi,
  getStudentReportCardsApi,
} from '../features/sprint5/exams.api';
import { listAcademicYearsApi } from '../features/sprint1/sprint1.api';
import { listStudentsApi } from '../features/sprint2/sprint2.api';

export function ReportCardsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [loadingPdf, setLoadingPdf] = useState<string | null>(null);

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const years = Array.isArray(yearsQuery.data) ? yearsQuery.data : [];

  const studentsQuery = useQuery({
    queryKey: ['students', 'report-cards-select'],
    queryFn: () => listStudentsApi(auth.accessToken!, { page: 1, pageSize: 100 }),
  });

  const effectiveAcademicYearId = useMemo(() => {
    if (!academicYearId) return undefined;
    if (academicYearId === '__current__') {
      const current = years.find((y: { isCurrent?: boolean }) => y.isCurrent);
      return current?.id;
    }
    return academicYearId;
  }, [academicYearId, years]);

  const reportCardsQuery = useQuery({
    queryKey: ['report-cards', selectedStudentId, effectiveAcademicYearId],
    enabled: Boolean(selectedStudentId),
    queryFn: () =>
      getStudentReportCardsApi(auth.accessToken!, selectedStudentId, {
        academicYearId: effectiveAcademicYearId,
      }),
  });

  const students = useMemo(() => studentsQuery.data?.items ?? [], [studentsQuery.data]);
  const reportCards = useMemo(() => reportCardsQuery.data?.items ?? [], [reportCardsQuery.data]);

  const handleViewPdf = async (termId: string) => {
    if (!selectedStudentId) return;
    setLoadingPdf(termId);
    try {
      const blob = await downloadStudentReportCardPdfApi(auth.accessToken!, selectedStudentId, termId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      showToast({
        type: 'error',
        title: 'Could not load report card',
        message: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setLoadingPdf(null);
    }
  };

  return (
    <SectionCard
      title="Report cards"
      subtitle="View or download student report cards by term or full academic year. Each report shows Test, Exam and Total per subject."
    >
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="min-w-[200px]">
          <label className="mb-1 block text-sm font-medium text-slate-700">Academic year</label>
          <select
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="h-10 w-full rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            aria-label="Select academic year"
          >
            <option value="">All years</option>
            <option value="__current__">Full academic year (current)</option>
            {years.map((y: { id: string; name: string; isCurrent?: boolean }) => (
              <option key={y.id} value={y.id}>
                {y.name}{y.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[240px]">
          <label className="mb-1 block text-sm font-medium text-slate-700">Student</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="h-10 w-full rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            aria-label="Select student"
          >
            <option value="">Select student</option>
            {students.map((s: { id: string; studentCode: string; firstName: string; lastName: string }) => (
              <option key={s.id} value={s.id}>
                {s.studentCode} – {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedStudentId ? (
        <EmptyState message="Select a student to see their report cards." />
      ) : reportCardsQuery.isPending ? (
        <div className="flex items-center gap-2 text-slate-600">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          Loading report cards…
        </div>
      ) : reportCardsQuery.isError ? (
        <StateView
          title="Could not load report cards"
          message={reportCardsQuery.error instanceof Error ? reportCardsQuery.error.message : 'Please try again.'}
        />
      ) : reportCards.length === 0 ? (
        <EmptyState message="No published report cards for this student. Lock and publish results from the Examination Portal first." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200 bg-brand-50">
                <th className="px-4 py-2 font-semibold text-slate-800">Term</th>
                <th className="px-4 py-2 font-semibold text-slate-800">Class</th>
                <th className="px-4 py-2 font-semibold text-slate-800">Academic year</th>
                <th className="px-4 py-2 font-semibold text-slate-800">Status</th>
                <th className="px-4 py-2 font-semibold text-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reportCards.map(
                (card: {
                  id: string;
                  term: { id: string; name: string };
                  classRoom: { code: string; name: string };
                  academicYear: { name: string };
                  status: string;
                }) => (
                  <tr key={card.id} className="border-b border-brand-50">
                    <td className="px-4 py-2">{card.term.name}</td>
                    <td className="px-4 py-2">
                      {card.classRoom.code} – {card.classRoom.name}
                    </td>
                    <td className="px-4 py-2">{card.academicYear.name}</td>
                    <td className="px-4 py-2 capitalize">{card.status.toLowerCase()}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleViewPdf(card.term.id)}
                        disabled={loadingPdf === card.term.id}
                        className="rounded bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                      >
                        {loadingPdf === card.term.id ? 'Opening…' : 'View PDF'}
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
