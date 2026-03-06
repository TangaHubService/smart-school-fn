import { useMutation, useQuery } from '@tanstack/react-query';
import { Eye, FileDown } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  downloadMyReportCardPdfApi,
  getMyReportCardsApi,
} from '../features/sprint5/exams.api';
import { listTermsApi } from '../features/sprint1/sprint1.api';

export function StudentReportCardsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [termId, setTermId] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const termsQuery = useQuery({
    queryKey: ['terms'],
    queryFn: () => listTermsApi(auth.accessToken!),
  });

  const reportCardsQuery = useQuery({
    queryKey: ['student-report-cards', termId],
    queryFn: () => getMyReportCardsApi(auth.accessToken!, termId || undefined),
  });

  const previewMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      const blob = await downloadMyReportCardPdfApi(auth.accessToken!, snapshotId);
      return URL.createObjectURL(blob);
    },
    onSuccess: (url) => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(url);
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not load report card',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (snapshot: { id: string; termName: string }) => {
      const blob = await downloadMyReportCardPdfApi(auth.accessToken!, snapshot.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${snapshot.termName}-report-card.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not download report card',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  const reportCards = reportCardsQuery.data?.items ?? [];
  const student = reportCardsQuery.data?.student;
  const terms = (termsQuery.data as any[]) ?? [];

  return (
    <div className="grid gap-5">
      <SectionCard
        title="My report cards"
        subtitle="View or download published report cards for your terms."
      >
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/80 p-3 lg:grid-cols-[220px_auto] lg:items-end">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Term</span>
              <select value={termId} onChange={(event) => setTermId(event.target.value)} className="h-11 rounded-xl border border-brand-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-400">
                <option value="">All terms</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>{term.name}</option>
                ))}
              </select>
            </label>
            <div className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              {student ? `${student.firstName} ${student.lastName} · ${student.studentCode}` : 'Student'}
            </div>
          </div>

          {reportCardsQuery.isPending ? (
            <div className="h-56 animate-pulse rounded-2xl border border-brand-100 bg-white/70" />
          ) : reportCardsQuery.isError ? (
            <StateView
              title="Could not load report cards"
              message="Retry to load your report cards."
              action={<button type="button" onClick={() => void reportCardsQuery.refetch()} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white">Retry</button>}
            />
          ) : reportCards.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reportCards.map((item) => (
                <article key={item.id} className="grid gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
                  <div className="grid gap-1">
                    <p className="text-lg font-bold text-slate-900">{item.term.name}</p>
                    <p className="text-sm text-slate-600">{item.classRoom.name} · {item.academicYear.name}</p>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-700">
                    <p>Average: <span className="font-semibold text-slate-900">{item.totals.averagePercentage.toFixed(2)}%</span></p>
                    <p>Grade: <span className="font-semibold text-slate-900">{item.totals.grade}</span></p>
                    <p>Position: <span className="font-semibold text-slate-900">{item.totals.position}/{item.totals.classSize}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => previewMutation.mutate(item.id)} className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      View PDF
                    </button>
                    <button type="button" onClick={() => downloadMutation.mutate({ id: item.id, termName: item.term.name })} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
                      <FileDown className="h-4 w-4" aria-hidden="true" />
                      Download
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No report cards yet" message="Published report cards will appear here after your school finalizes results." />
          )}
        </div>
      </SectionCard>

      <Modal
        open={Boolean(previewUrl)}
        title="Report card preview"
        onClose={() => {
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
          setPreviewUrl('');
        }}
        footer={
          <div className="flex justify-end">
            <button type="button" onClick={() => {
              if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
              }
              setPreviewUrl('');
            }} className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Close</button>
          </div>
        }
      >
        {previewUrl ? <iframe title="Report card PDF" src={previewUrl} className="h-[70vh] w-full rounded-xl border border-brand-100" /> : null}
      </Modal>
    </div>
  );
}
