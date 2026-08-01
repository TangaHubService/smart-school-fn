import { FileText } from 'lucide-react';

export interface LessonPlanAuditItem {
  id: string;
  teacher: string;
  class: string;
  subject: string;
  submittedAt: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
}

interface LessonPlanAuditTableProps {
  items: LessonPlanAuditItem[];
  isLoading?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

export function LessonPlanAuditTable({ items, isLoading }: LessonPlanAuditTableProps) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-2 h-12 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">Lesson Plan Audit</h2>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {items.length} {items.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No lesson plan data yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2 pr-3">Teacher</th>
                <th className="py-2 pr-3">Class</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Submitted</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2.5 pr-3 font-medium text-slate-900">{item.teacher}</td>
                  <td className="py-2.5 pr-3 text-slate-700">{item.class}</td>
                  <td className="py-2.5 pr-3 text-slate-700">{item.subject}</td>
                  <td className="py-2.5 pr-3 text-slate-600">
                    {item.submittedAt ?? '—'}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[item.status]}`}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
