import { Users } from 'lucide-react';

export interface ActiveStudent {
  id: string;
  name: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'unmarked';
}

interface ActiveStudentListProps {
  students: ActiveStudent[];
  total?: number;
  isLoading?: boolean;
}

const DOT_STYLES: Record<string, string> = {
  present: 'bg-green-500',
  absent: 'bg-red-500',
  late: 'bg-amber-500',
  excused: 'bg-slate-400',
  unmarked: 'bg-slate-200',
};

const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
  unmarked: 'Unmarked',
};

export function ActiveStudentList({ students, total, isLoading }: ActiveStudentListProps) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-slate-200" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="mb-2 h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">Active Students</h2>
        </div>
        {total !== undefined && (
          <span className="text-xs font-medium text-slate-500">{total} total</span>
        )}
      </div>

      {students.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No students enrolled.</p>
      ) : (
        <div className="space-y-1">
          {students.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 transition hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${DOT_STYLES[s.status]}`} />
                <span className="text-sm font-medium text-slate-900">{s.name}</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {STATUS_LABELS[s.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
