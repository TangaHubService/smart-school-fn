import { Download, Filter, Search } from 'lucide-react';
import { useState } from 'react';

import { SectionCard } from '../components/section-card';

// TODO: Replace with API call when backend is ready
// import { useQuery } from '@tanstack/react-query';
// import { listAuditLogsApi } from '../features/audit/audit.api';

const DUMMY_LOGS = [
  { id: '1', action: 'User login', user: 'admin@smartschool.rw', timestamp: '2025-03-12 14:32', ip: '192.168.1.1' },
  { id: '2', action: 'School created', user: 'admin@smartschool.rw', timestamp: '2025-03-12 14:15', ip: '192.168.1.1' },
  { id: '3', action: 'User updated', user: 'admin@smartschool.rw', timestamp: '2025-03-12 13:58', ip: '192.168.1.1' },
  { id: '4', action: 'Settings changed', user: 'admin@smartschool.rw', timestamp: '2025-03-12 12:20', ip: '192.168.1.1' },
  { id: '5', action: 'Report exported', user: 'admin@smartschool.rw', timestamp: '2025-03-12 11:45', ip: '192.168.1.1' },
];

export function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // TODO: Integrate with backend when API is available
  // const { data } = useQuery({
  //   queryKey: ['audit-logs', search, actionFilter],
  //   queryFn: () => listAuditLogsApi(accessToken, { search, action: actionFilter }),
  // });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-600">
          System activity and security logs. Ready for backend integration.
        </p>
      </div>

      <SectionCard
        title="Activity Log"
        subtitle="Track all system actions"
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
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="h-10 w-full rounded-lg border border-brand-200 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-10 rounded-lg border border-brand-200 px-3 text-sm"
            >
              <option value="all">All actions</option>
              <option value="login">Login</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100">
                <th className="pb-3 text-left font-semibold text-slate-700">Action</th>
                <th className="pb-3 text-left font-semibold text-slate-700">User</th>
                <th className="pb-3 text-left font-semibold text-slate-700">Timestamp</th>
                <th className="pb-3 text-left font-semibold text-slate-700">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {DUMMY_LOGS.map((log) => (
                <tr key={log.id} className="border-b border-brand-50">
                  <td className="py-3 font-medium text-slate-900">{log.action}</td>
                  <td className="py-3 text-slate-600">{log.user}</td>
                  <td className="py-3 text-slate-600">{log.timestamp}</td>
                  <td className="py-3 text-slate-600">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </section>
  );
}
