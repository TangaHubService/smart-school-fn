import { Bell, Check, CheckCheck, Filter } from 'lucide-react';
import { useState } from 'react';

import { SectionCard } from '../components/section-card';

// TODO: Replace with API call when backend is ready
// import { useQuery, useMutation } from '@tanstack/react-query';
// import { listNotificationsApi, markNotificationReadApi } from '../features/notifications/notifications.api';

const DUMMY_NOTIFICATIONS = [
  {
    id: '1',
    title: 'New school registered',
    message: 'Green Valley Academy has completed registration.',
    time: '2 hours ago',
    read: false,
    type: 'system',
  },
  {
    id: '2',
    title: 'Report generated',
    message: 'Monthly attendance report is ready for download.',
    time: '5 hours ago',
    read: false,
    type: 'report',
  },
  {
    id: '3',
    title: 'System maintenance',
    message: 'Scheduled maintenance on March 15, 2025 02:00–04:00.',
    time: '1 day ago',
    read: true,
    type: 'system',
  },
  {
    id: '4',
    title: 'New user signup',
    message: 'Admin user registered for Kigali Primary School.',
    time: '2 days ago',
    read: true,
    type: 'user',
  },
];

export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // TODO: Integrate with backend when API is available
  // const { data } = useQuery({
  //   queryKey: ['notifications', filter],
  //   queryFn: () => listNotificationsApi(accessToken, { unreadOnly: filter === 'unread' }),
  // });

  const notifications =
    filter === 'unread'
      ? DUMMY_NOTIFICATIONS.filter((n) => !n.read)
      : DUMMY_NOTIFICATIONS;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">
          System notifications and alerts. Ready for backend integration.
        </p>
      </div>

      <SectionCard
        title="All Notifications"
        subtitle={`${DUMMY_NOTIFICATIONS.filter((n) => !n.read).length} unread`}
        action={
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="unread">Unread only</option>
            </select>
          </div>
        }
      >
        <div className="divide-y divide-brand-100">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Bell className="h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 py-4 ${!n.read ? 'bg-brand-50/50' : ''}`}
              >
                <div
                  className={`mt-1 rounded-full p-1.5 ${
                    n.read ? 'bg-slate-100' : 'bg-brand-100'
                  }`}
                >
                  <Bell className="h-4 w-4 text-brand-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${n.read ? 'text-slate-600' : 'text-slate-900'}`}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-500">{n.time}</p>
                </div>
                {!n.read && (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100"
                    onClick={() => {}}
                  >
                    <Check className="h-3 w-3" />
                    Mark read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-4 flex justify-end border-t border-brand-100 pt-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
            onClick={() => {}}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        </div>
      </SectionCard>
    </section>
  );
}
