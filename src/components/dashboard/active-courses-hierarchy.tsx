import { BookOpen, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface CourseHierarchyItem {
  id: string;
  title: string;
  grade: string;
  class: string;
  subject: string;
  progress: number;
}

interface ActiveCoursesHierarchyProps {
  items: CourseHierarchyItem[];
  isLoading?: boolean;
}

export function ActiveCoursesHierarchy({ items, isLoading }: ActiveCoursesHierarchyProps) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 h-5 w-44 animate-pulse rounded bg-slate-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-3 h-14 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Active Courses</h2>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No active courses.</p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Link
              key={c.id}
              to={`/student/courses/${c.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/40"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {c.grade} / {c.class} / {c.subject}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${c.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-brand-700">{c.progress}%</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
