import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { EmptyState } from '../components/empty-state';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useAuth } from '../features/auth/auth.context';
import { listMyChildrenApi } from '../features/sprint2/sprint2.api';
import { listAcademicYearsApi } from '../features/sprint1/sprint1.api';
import { listTimetableSlotsApi } from '../features/timetable/timetable.api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function ParentTimetablePage() {
  const auth = useAuth();
  const [selectedChildId, setSelectedChildId] = useState('');

  const childrenQuery = useQuery({
    queryKey: ['parent', 'my-children'],
    queryFn: () => listMyChildrenApi(auth.accessToken!),
    enabled: !!auth.accessToken,
  });

  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
    enabled: !!auth.accessToken,
  });

  const children = childrenQuery.data?.students ?? [];
  const currentYear = yearsQuery.data?.find((y: any) => y.isCurrent) ?? yearsQuery.data?.[0];
  const classRoomId = children.find(c => c.id === selectedChildId)?.currentEnrollment?.classRoom.id;

  const timetableQuery = useQuery({
    queryKey: ['parent', 'timetable', selectedChildId, currentYear?.id],
    queryFn: () => listTimetableSlotsApi(auth.accessToken!, {
      academicYearId: currentYear?.id ?? '',
      classRoomId: classRoomId ?? '',
    }),
    enabled: !!auth.accessToken && !!selectedChildId && !!classRoomId && !!currentYear?.id,
  });

  const slots = timetableQuery.data?.slots ?? [];

  const getSlotsForDay = (dayIndex: number) => {
    return slots.filter(s => s.dayOfWeek === dayIndex + 1).sort((a, b) => a.periodNumber - b.periodNumber);
  };

  return (
    <SectionCard title="Timetable" subtitle="View your children's class schedule">
      <div className="mb-4 flex gap-4">
        <select
          value={selectedChildId}
          onChange={(e) => setSelectedChildId(e.target.value)}
          className="h-10 rounded-lg border border-brand-200 px-3"
        >
          <option value="">Select a child</option>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.firstName} {child.lastName} - {child.currentEnrollment?.classRoom.name ?? 'Not enrolled'}
            </option>
          ))}
        </select>
        {currentYear && <span className="self-center text-sm text-slate-600">Year: {currentYear.name}</span>}
      </div>

      {!selectedChildId ? (
        <EmptyState message="Select a child to view their timetable" />
      ) : timetableQuery.isPending ? (
        <div className="space-y-2">
          <div className="h-10 bg-brand-100 animate-pulse rounded" />
          <div className="h-10 bg-brand-100 animate-pulse rounded" />
        </div>
      ) : timetableQuery.isError ? (
        <StateView title="Could not load" message="Retry" action={<button onClick={() => timetableQuery.refetch()} className="btn-primary">Retry</button>} />
      ) : slots.length === 0 ? (
        <EmptyState message="No timetable available for this class" />
      ) : (
        <div className="overflow-x-auto rounded border border-brand-100">
          <table className="w-full text-sm">
            <thead className="bg-brand-50">
              <tr className="border-b border-brand-100">
                <th className="p-2 text-left font-semibold">Day</th>
                <th className="p-2 text-left font-semibold">Period</th>
                <th className="p-2 text-left font-semibold">Time</th>
                <th className="p-2 text-left font-semibold">Subject</th>
                <th className="p-2 text-left font-semibold">Teacher</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, dayIndex) => {
                const daySlots = getSlotsForDay(dayIndex);
                if (daySlots.length === 0) return null;
                return daySlots.map((slot, idx) => (
                  <tr key={`${dayIndex}-${slot.id}`} className="border-b border-brand-50">
                    {idx === 0 && <td rowSpan={daySlots.length} className="p-2 font-medium bg-brand-50/30">{day}</td>}
                    <td className="p-2">{slot.periodNumber}</td>
                    <td className="p-2">{slot.startTime} - {slot.endTime}</td>
                    <td className="p-2 font-medium">{slot.course?.subject?.name ?? slot.course?.title}</td>
                    <td className="p-2">{slot.course?.teacherUser?.firstName} {slot.course?.teacherUser?.lastName}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}