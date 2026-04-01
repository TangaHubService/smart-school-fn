import { BarChart3, Download, FileBarChart2 } from 'lucide-react';

import { SectionCard } from '../components/section-card';

// TODO: Replace with API call when backend is ready
// import { useQuery } from '@tanstack/react-query';
// import { getReportsAnalyticsApi } from '../features/reports/reports.api';

const DUMMY_REPORTS = [
  { id: '1', name: 'User Overview Report', type: 'Users', date: '2025-03-12', status: 'Generated' },
  { id: '2', name: 'School Performance Summary', type: 'Schools', date: '2025-03-11', status: 'Generated' },
  { id: '3', name: 'Attendance Summary', type: 'Attendance', date: '2025-03-10', status: 'Pending' },
  { id: '4', name: 'Exam Results Overview', type: 'Exams', date: '2025-03-09', status: 'Generated' },
  { id: '5', name: 'Discipline Incidents', type: 'Conduct', date: '2025-03-08', status: 'Generated' },
];

const DUMMY_ANALYTICS = [
  { label: 'Active Users', value: 1247, change: '+12%' },
  { label: 'Schools Enrolled', value: 89, change: '+5%' },
  { label: 'Exams Completed', value: 342, change: '+8%' },
  { label: 'Attendance Rate', value: '94%', change: '+2%' },
];

export function ReportsAnalyticsPage() {
  // TODO: Integrate with backend when API is available
  // const { data, isPending } = useQuery({
  //   queryKey: ['reports-analytics'],
  //   queryFn: () => getReportsAnalyticsApi(accessToken),
  // });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">
          System-wide reports and analytics. Ready for backend integration.
        </p>
      </div>

      <SectionCard title="Analytics Overview" subtitle="Key metrics across the platform">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DUMMY_ANALYTICS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg border border-brand-100 bg-white p-4"
            >
              <div className="rounded-lg bg-brand-100 p-2">
                <BarChart3 className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">{item.label}</p>
                <p className="text-lg font-bold text-slate-900">{item.value}</p>
                <span className="text-xs text-green-600">{item.change}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Latest Reports"
        subtitle="Generated reports available for download"
        action={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        }
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100">
                <th className="pb-3 text-left font-semibold text-slate-700">Report Name</th>
                <th className="pb-3 text-left font-semibold text-slate-700">Type</th>
                <th className="pb-3 text-left font-semibold text-slate-700">Date</th>
                <th className="pb-3 text-left font-semibold text-slate-700">Status</th>
                <th className="pb-3 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {DUMMY_REPORTS.map((report) => (
                <tr key={report.id} className="border-b border-brand-50">
                  <td className="py-3">
                    <span className="flex items-center gap-2">
                      <FileBarChart2 className="h-4 w-4 text-slate-400" />
                      {report.name}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600">{report.type}</td>
                  <td className="py-3 text-slate-600">{report.date}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        report.status === 'Generated'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      className="text-brand-600 hover:underline"
                      onClick={() => {}}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </section>
  );
}
