import { useMutation, useQuery } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  ConductSeverity,
  createConductIncidentApi,
} from '../features/conduct/conduct.api';
import { listStudentsApi } from '../features/sprint2/sprint2.api';

const severityOptions: ConductSeverity[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

export function ConductCreateIncidentPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [studentSearch, setStudentSearch] = useState('');
  const [form, setForm] = useState({
    studentId: '',
    occurredAt: new Date().toISOString().slice(0, 16),
    category: '',
    title: '',
    description: '',
    severity: 'MODERATE' as ConductSeverity,
    location: '',
    reporterNotes: '',
  });

  const studentsQuery = useQuery({
    queryKey: ['conduct-create-students', studentSearch],
    queryFn: () =>
      listStudentsApi(auth.accessToken!, {
        q: studentSearch.trim() || undefined,
        page: 1,
        pageSize: 100,
      }),
  });

  const selectedStudent = useMemo(
    () => studentsQuery.data?.items.find((student) => student.id === form.studentId) ?? null,
    [studentsQuery.data?.items, form.studentId],
  );

  const createIncidentMutation = useMutation({
    mutationFn: () =>
      createConductIncidentApi(auth.accessToken!, {
        studentId: form.studentId,
        classRoomId: selectedStudent?.currentEnrollment?.classRoom.id,
        occurredAt: new Date(form.occurredAt).toISOString(),
        category: form.category.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        severity: form.severity,
        location: form.location.trim() || undefined,
        reporterNotes: form.reporterNotes.trim() || undefined,
      }),
    onSuccess: (incident) => {
      showToast({
        type: 'success',
        title: 'Incident recorded',
        message: 'The conduct incident is now available in the school and government views.',
      });
      navigate(`/admin/conduct/${incident.id}`);
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not record incident',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createIncidentMutation.mutate();
  }

  return (
    <SectionCard
      title="Record Conduct Incident"
      subtitle="Capture discipline or conduct concerns without altering the current student enrollment or exams flows."
      action={
        <Link
          to="/admin/conduct"
          className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Back to incidents
        </Link>
      }
    >
      {studentsQuery.isError ? (
        <StateView
          title="Could not load students"
          message="Student records are needed to attach the conduct incident to the correct learner."
          action={
            <button
              type="button"
              onClick={() => void studentsQuery.refetch()}
              className="rounded-lg border border-brand-300 bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : (
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Search student
              <input
                type="search"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Type name or student code"
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Student
              <select
                value={form.studentId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, studentId: event.target.value }))
                }
                required
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              >
                <option value="">Select student</option>
                {(studentsQuery.data?.items ?? []).map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.studentCode} - {student.firstName} {student.lastName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Student context</p>
            <p className="mt-1">
              Class:{' '}
              {selectedStudent?.currentEnrollment?.classRoom.name ?? 'No active class assignment'}
            </p>
            <p>
              Academic year:{' '}
              {selectedStudent?.currentEnrollment?.academicYear.name ?? 'Not available'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Occurred at
              <input
                type="datetime-local"
                value={form.occurredAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, occurredAt: event.target.value }))
                }
                required
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Severity
              <select
                value={form.severity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    severity: event.target.value as ConductSeverity,
                  }))
                }
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              >
                {severityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Category
              <input
                type="text"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
                required
                placeholder="Bullying, absenteeism, misconduct"
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Location
              <input
                type="text"
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="Classroom, dormitory, sports field"
                className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Incident title
            <input
              type="text"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              required
              placeholder="Short summary visible in lists and dashboards"
              className="h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              required
              rows={6}
              placeholder="Describe what happened, who was involved, and the immediate context."
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Internal reporter notes
            <textarea
              value={form.reporterNotes}
              onChange={(event) =>
                setForm((current) => ({ ...current, reporterNotes: event.target.value }))
              }
              rows={4}
              placeholder="Optional notes for school staff. These are hidden from government auditor views."
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-400"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-brand-100 pt-4">
            <Link
              to="/admin/conduct"
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createIncidentMutation.isPending || !form.studentId}
              className="rounded-lg border border-brand-300 bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createIncidentMutation.isPending ? 'Saving...' : 'Save incident'}
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}
