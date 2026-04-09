import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { EmptyState } from '../components/empty-state';
import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  deleteStaffMemberApi,
  getStaffMemberApi,
  inviteStaffApi,
  listAcademicYearsApi,
  listClassRoomsApi,
  listInvitesApi,
  listSubjectsApi,
  listStaffMembersApi,
  revokeInviteApi,
  StaffMember,
  updateStaffMemberApi,
} from '../features/sprint1/sprint1.api';
import {
  assignTeacherBySubjectApi,
  listCoursesApi,
} from '../features/sprint4/lms.api';

interface AcademicYearOption {
  id: string;
  name: string;
  isCurrent?: boolean;
}

interface ClassRoomOption {
  id: string;
  code: string;
  name: string;
}

interface SubjectOption {
  id: string;
  code: string;
  name: string;
}

interface SearchableOption {
  id: string;
  label: string;
}

interface StaffInviteItem {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
  role?: {
    name?: string;
  };
}

type StaffTableRow =
  | {
      kind: 'MEMBER';
      id: string;
      name: string;
      email: string;
      roleLabel: string;
      statusLabel: string;
      typeLabel: 'Member';
      member: StaffMember;
    }
  | {
      kind: 'INVITE';
      id: string;
      name: string;
      email: string;
      roleLabel: string;
      statusLabel: string;
      typeLabel: 'Invite';
      invite: StaffInviteItem;
    };

type DeleteTarget =
  | {
      kind: 'MEMBER';
      id: string;
      label: string;
    }
  | {
      kind: 'INVITE';
      id: string;
      label: string;
    };

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  roleName: z.string().trim().min(2).max(60),
  expiresInDays: z.coerce.number().int().min(1).max(14).default(7),
});

const editMemberSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(30).or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

type InviteForm = z.infer<typeof inviteSchema>;
type EditMemberForm = z.infer<typeof editMemberSchema>;

const defaultInviteValues: InviteForm = {
  email: '',
  roleName: 'TEACHER',
  expiresInDays: 7,
};

const defaultEditValues: EditMemberForm = {
  firstName: '',
  lastName: '',
  phone: '',
  status: 'ACTIVE',
};

function formatMemberName(member: Pick<StaffMember, 'firstName' | 'lastName'>) {
  return `${member.firstName} ${member.lastName}`.trim();
}

function isTeacher(member: Pick<StaffMember, 'roles'>) {
  return member.roles.includes('TEACHER');
}

interface SearchableSelectProps {
  label: string;
  value: string;
  selectedId: string;
  options: SearchableOption[];
  placeholder: string;
  ariaLabel: string;
  onInputChange: (value: string) => void;
  onOptionSelect: (option: SearchableOption) => void;
}

function updateSearchableSelection(
  value: string,
  options: SearchableOption[],
  onText: (value: string) => void,
  onId: (value: string) => void,
) {
  onText(value);
  const normalized = value.trim().toLowerCase();
  const exact = options.find((item) => item.label.toLowerCase() === normalized);
  onId(exact?.id ?? '');
}

function SearchableSelect({
  label,
  value,
  selectedId,
  options,
  placeholder,
  ariaLabel,
  onInputChange,
  onOptionSelect,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return options;
    }

    return options.filter((item) => item.label.toLowerCase().includes(query));
  }, [options, value]);

  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <div className="relative">
        <input
          value={value}
          onChange={(event) => {
            onInputChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 120);
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400"
          aria-label={ariaLabel}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsOpen((current) => !current)}
          className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-slate-500 hover:bg-brand-50"
          aria-label={`Toggle ${label} options`}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-56 w-full overflow-auto rounded-xl border border-brand-200 bg-white shadow-lg">
            {filtered.length ? (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onOptionSelect(item);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-brand-50"
                >
                  <span className="truncate">{item.label}</span>
                  {selectedId === item.id ? <Check className="h-4 w-4 text-brand-600" /> : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-slate-500">No matching options.</p>
            )}
          </div>
        ) : null}
      </div>
    </label>
  );
}

export function StaffPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<StaffMember | null>(null);
  const [selectedMemberForView, setSelectedMemberForView] = useState<StaffMember | null>(null);
  const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState<StaffMember | null>(null);
  const [assignYearText, setAssignYearText] = useState('');
  const [assignYearId, setAssignYearId] = useState('');
  const [assignClassText, setAssignClassText] = useState('');
  const [assignClassId, setAssignClassId] = useState('');
  const [assignSubjectText, setAssignSubjectText] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assignFormError, setAssignFormError] = useState<string | null>(null);
  const [detailCoursePage, setDetailCoursePage] = useState(1);

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: defaultInviteValues,
  });

  const editForm = useForm<EditMemberForm>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: defaultEditValues,
  });

  useEffect(() => {
    if (!selectedMemberForEdit) {
      editForm.reset(defaultEditValues);
      return;
    }

    editForm.reset({
      firstName: selectedMemberForEdit.firstName,
      lastName: selectedMemberForEdit.lastName,
      phone: selectedMemberForEdit.phone ?? '',
      status: selectedMemberForEdit.status,
    });
  }, [selectedMemberForEdit, editForm]);

  useEffect(() => {
    if (!selectedMemberForView) {
      setDetailCoursePage(1);
    }
  }, [selectedMemberForView]);

  const membersQuery = useQuery({
    queryKey: ['staff-members', searchText, roleFilter],
    queryFn: () =>
      listStaffMembersApi(auth.accessToken!, {
        q: searchText.trim() || undefined,
        roleName: roleFilter !== 'ALL' ? roleFilter : undefined,
      }),
  });

  const invitesQuery = useQuery({
    queryKey: ['staff-invites'],
    queryFn: () => listInvitesApi(auth.accessToken!),
  });

  const memberDetailQuery = useQuery({
    queryKey: ['staff-member-detail', selectedMemberForView?.id ?? null],
    enabled: Boolean(selectedMemberForView),
    queryFn: () => getStaffMemberApi(auth.accessToken!, selectedMemberForView!.id),
  });

  const academicYearsQuery = useQuery({
    queryKey: ['staff-assignment-years'],
    enabled: Boolean(selectedTeacherForAssign),
    queryFn: () => listAcademicYearsApi(auth.accessToken!),
  });

  const classRoomsQuery = useQuery({
    queryKey: ['staff-assignment-classes'],
    enabled: Boolean(selectedTeacherForAssign),
    queryFn: () => listClassRoomsApi(auth.accessToken!),
  });

  const subjectsQuery = useQuery({
    queryKey: ['staff-assignment-subjects'],
    enabled: Boolean(selectedTeacherForAssign),
    queryFn: () => listSubjectsApi(auth.accessToken!),
  });

  const selectedSubjectCourseQuery = useQuery({
    queryKey: [
      'staff-subject-course-lookup',
      assignYearId || null,
      assignClassId || null,
      assignSubjectId || null,
    ],
    enabled: Boolean(selectedTeacherForAssign && assignYearId && assignClassId && assignSubjectId),
    queryFn: () =>
      listCoursesApi(auth.accessToken!, {
        academicYearId: assignYearId,
        classId: assignClassId,
        page: 1,
        pageSize: 50,
      }),
  });

  const viewedMember = memberDetailQuery.data ?? selectedMemberForView;
  const viewedMemberIsTeacher = viewedMember ? isTeacher(viewedMember) : false;

  const teacherAssignedCoursesQuery = useQuery({
    queryKey: ['staff-member-assigned-courses', viewedMember?.id ?? null, detailCoursePage],
    enabled: Boolean(viewedMember?.id) && viewedMemberIsTeacher,
    queryFn: () =>
      listCoursesApi(auth.accessToken!, {
        teacherUserId: viewedMember!.id,
        page: detailCoursePage,
        pageSize: 20,
      }),
  });

  const inviteMutation = useMutation({
    mutationFn: (values: InviteForm) => inviteStaffApi(auth.accessToken!, values),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['staff-invites'] });
      inviteForm.reset(defaultInviteValues);
      const email = (result as { email?: string }).email ?? 'staff member';
      setIsInviteModalOpen(false);
      showToast({
        type: 'success',
        title: 'Invite sent',
        message: `Invitation email sent to ${email}.`,
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not send invite',
        message: error instanceof Error ? error.message : 'Invite request failed',
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: (values: EditMemberForm) =>
      updateStaffMemberApi(auth.accessToken!, selectedMemberForEdit!.id, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone.trim() ? values.phone.trim() : null,
        status: values.status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      if (selectedMemberForView) {
        void queryClient.invalidateQueries({
          queryKey: ['staff-member-detail', selectedMemberForView.id],
        });
      }
      setSelectedMemberForEdit(null);
      showToast({
        type: 'success',
        title: 'Staff member updated',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update staff member',
        message: error instanceof Error ? error.message : 'Update failed',
      });
    },
  });

  const toggleMemberStatusMutation = useMutation({
    mutationFn: (input: { member: StaffMember; status: 'ACTIVE' | 'INACTIVE' }) =>
      updateStaffMemberApi(auth.accessToken!, input.member.id, {
        status: input.status,
      }),
    onSuccess: (updatedMember, input) => {
      void queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      void queryClient.invalidateQueries({
        queryKey: ['staff-member-detail', input.member.id],
      });

      showToast({
        type: 'success',
        title: input.status === 'ACTIVE' ? 'Account activated' : 'Account deactivated',
        message: `${updatedMember.firstName} ${updatedMember.lastName} is now ${updatedMember.status}.`,
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not update account status',
        message: error instanceof Error ? error.message : 'Status update failed',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (target: DeleteTarget) =>
      target.kind === 'MEMBER'
        ? deleteStaffMemberApi(auth.accessToken!, target.id)
        : revokeInviteApi(auth.accessToken!, target.id),
    onSuccess: (_result, target) => {
      if (target.kind === 'MEMBER') {
        void queryClient.invalidateQueries({ queryKey: ['staff-members'] });
        void queryClient.invalidateQueries({ queryKey: ['staff-member-detail', target.id] });
        if (selectedMemberForView?.id === target.id) {
          setSelectedMemberForView(null);
        }
        showToast({
          type: 'success',
          title: 'Staff member deleted',
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['staff-invites'] });
        showToast({
          type: 'success',
          title: 'Invite deleted',
          message: 'Pending invite has been revoked.',
        });
      }

      setDeleteTarget(null);
      setDeleteError(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Delete failed';
      setDeleteError(message);
      showToast({
        type: 'error',
        title: 'Could not delete',
        message,
      });
    },
  });

  const assignSubjectMutation = useMutation({
    mutationFn: (values: {
      teacherUserId: string;
      academicYearId: string;
      classRoomId: string;
      subjectId: string;
    }) =>
      assignTeacherBySubjectApi(auth.accessToken!, {
        teacherUserId: values.teacherUserId,
        academicYearId: values.academicYearId,
        classRoomId: values.classRoomId,
        subjectId: values.subjectId,
      }),
    onSuccess: (course) => {
      void queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-subject-course-lookup'] });
      const viewedMemberId = selectedMemberForView?.id;
      if (viewedMemberId && viewedMemberId === selectedTeacherForAssign?.id) {
        void queryClient.invalidateQueries({
          queryKey: ['staff-member-assigned-courses', viewedMemberId],
        });
      }
      showToast({
        type: 'success',
        title: 'Subject assigned',
        message: `${course.subject?.name ?? course.title} is now assigned to ${course.teacher.firstName} ${course.teacher.lastName}.`,
      });
      closeAssignSubjectModal();
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not assign subject',
        message: error instanceof Error ? error.message : 'Assignment failed',
      });
    },
  });

  const members = ((membersQuery.data as StaffMember[] | undefined) ?? []).slice();
  const invites = ((invitesQuery.data as StaffInviteItem[] | undefined) ?? []).slice();
  const pendingInvites = invites.filter((item) => item.status === 'PENDING');
  const academicYears = ((academicYearsQuery.data as AcademicYearOption[] | undefined) ?? []).slice();
  const classRooms = ((classRoomsQuery.data as ClassRoomOption[] | undefined) ?? []).slice();
  const subjects = ((subjectsQuery.data as SubjectOption[] | undefined) ?? []).slice();

  useEffect(() => {
    if (!selectedTeacherForAssign || assignYearId || !academicYears.length) {
      return;
    }

    const currentYear = academicYears.find((item) => item.isCurrent) ?? academicYears[0];
    if (!currentYear) {
      return;
    }

    setAssignYearId(currentYear.id);
    setAssignYearText(currentYear.name);
  }, [selectedTeacherForAssign, assignYearId, academicYears]);

  const academicYearOptions = useMemo<SearchableOption[]>(
    () => academicYears.map((item) => ({ id: item.id, label: item.name })),
    [academicYears],
  );
  const classOptions = useMemo<SearchableOption[]>(
    () => classRooms.map((item) => ({ id: item.id, label: `${item.name} (${item.code})` })),
    [classRooms],
  );
  const subjectOptions = useMemo<SearchableOption[]>(
    () => subjects.map((item) => ({ id: item.id, label: `${item.name} (${item.code})` })),
    [subjects],
  );

  const selectedSubjectCourse = useMemo(() => {
    if (!assignSubjectId) {
      return null;
    }

    const items = selectedSubjectCourseQuery.data?.items ?? [];
    return items.find((item) => item.subject?.id === assignSubjectId) ?? null;
  }, [selectedSubjectCourseQuery.data?.items, assignSubjectId]);

  const rows = useMemo<StaffTableRow[]>(() => {
    const memberRows: StaffTableRow[] = members.map((member) => ({
      kind: 'MEMBER',
      id: `member-${member.id}`,
      name: formatMemberName(member),
      email: member.email,
      roleLabel: member.roles.join(', '),
      statusLabel: member.status,
      typeLabel: 'Member',
      member,
    }));

    const inviteRows: StaffTableRow[] = pendingInvites
      .filter((invite) => {
        if (roleFilter === 'ALL') {
          return true;
        }

        return (invite.role?.name ?? '').toUpperCase() === roleFilter.toUpperCase();
      })
      .filter((invite) => {
        const query = searchText.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return `${invite.email} ${invite.role?.name ?? ''}`.toLowerCase().includes(query);
      })
      .map((invite) => ({
        kind: 'INVITE',
        id: `invite-${invite.id}`,
        name: 'Pending invite',
        email: invite.email,
        roleLabel: invite.role?.name ?? 'Unknown',
        statusLabel: invite.status,
        typeLabel: 'Invite',
        invite,
      }));

    return [...memberRows, ...inviteRows];
  }, [members, pendingInvites, roleFilter, searchText]);

  const roleOptions = useMemo(() => {
    const fromMembers = members.flatMap((member) => member.roles);
    const fromInvites = pendingInvites.map((invite) => invite.role?.name).filter(Boolean) as string[];
    return [...new Set([...fromMembers, ...fromInvites])].sort();
  }, [members, pendingInvites]);

  function openAssignCourses(member: StaffMember) {
    setSelectedTeacherForAssign(member);
    setAssignFormError(null);
    setAssignClassId('');
    setAssignClassText('');
    setAssignSubjectId('');
    setAssignSubjectText('');
    const currentYear = academicYears.find((item) => item.isCurrent) ?? academicYears[0];
    if (currentYear) {
      setAssignYearId(currentYear.id);
      setAssignYearText(currentYear.name);
      return;
    }

    setAssignYearId('');
    setAssignYearText('');
  }

  function closeAssignSubjectModal() {
    setSelectedTeacherForAssign(null);
    setAssignFormError(null);
    setAssignYearId('');
    setAssignYearText('');
    setAssignClassId('');
    setAssignClassText('');
    setAssignSubjectId('');
    setAssignSubjectText('');
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Staff"
        subtitle="Manage active staff and pending invites from one table. Teacher rows include subject assignment actions."
        action={
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Add staff invite
          </button>
        }
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by name, email, or role"
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            aria-label="Search staff"
          />

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
            aria-label="Filter role"
          >
            <option value="ALL">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              void membersQuery.refetch();
              void invitesQuery.refetch();
            }}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Refresh
          </button>
        </div>

        {(membersQuery.isPending || invitesQuery.isPending) ? (
          <div className="grid gap-2" role="status" aria-live="polite">
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
            <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          </div>
        ) : null}

        {(membersQuery.isError || invitesQuery.isError) ? (
          <StateView
            title="Could not load staff data"
            message="Retry loading staff members and invites."
            action={
              <button
                type="button"
                onClick={() => {
                  void membersQuery.refetch();
                  void invitesQuery.refetch();
                }}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            }
          />
        ) : null}

        {!membersQuery.isPending &&
        !invitesQuery.isPending &&
        !membersQuery.isError &&
        !invitesQuery.isError &&
        !rows.length ? (
          <EmptyState
            title="No staff records found"
            message="Invite staff to create their accounts and manage them here."
          />
        ) : null}

        {!membersQuery.isPending &&
        !invitesQuery.isPending &&
        !membersQuery.isError &&
        !invitesQuery.isError &&
        rows.length ? (
          <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
            <table className="w-full min-w-full table-auto text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-slate-700">
                  <th className="px-2 py-2 font-semibold">#</th>
                  <th className="px-2 py-2 font-semibold">Name</th>
                  <th className="px-2 py-2 font-semibold">Email</th>
                  <th className="px-2 py-2 font-semibold">Role</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-2 py-2 font-semibold">Type</th>
                  <th className="px-2 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-brand-50">
                    <td className="px-2 py-2 align-middle text-slate-600">{index + 1}</td>
                    <td className="px-2 py-2 align-middle font-medium text-slate-900">{row.name}</td>
                    <td className="px-2 py-2 align-middle">{row.email}</td>
                    <td className="px-2 py-2 align-middle">{row.roleLabel}</td>
                    <td className="px-2 py-2 align-middle">{row.statusLabel}</td>
                    <td className="px-2 py-2 align-middle">{row.typeLabel}</td>
                    <td className="px-2 py-2 align-middle">
                      <div className="flex flex-wrap gap-2">
                        {row.kind === 'MEMBER' ? (
                          (() => {
                            const isSelfMember = row.member.id === auth.me?.id;
                            const nextStatus: 'ACTIVE' | 'INACTIVE' =
                              row.member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                            const statusActionLabel =
                              nextStatus === 'ACTIVE' ? 'Activate' : 'Deactivate';
                            const disableStatusAction =
                              toggleMemberStatusMutation.isPending ||
                              (isSelfMember && nextStatus === 'INACTIVE');
                            const isUpdatingThisMember =
                              toggleMemberStatusMutation.isPending &&
                              toggleMemberStatusMutation.variables?.member.id === row.member.id;

                            return (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setSelectedMemberForView(row.member)}
                                  className="rounded-md border border-brand-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedMemberForEdit(row.member)}
                                  className="rounded-md border border-brand-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={disableStatusAction}
                                  title={
                                    isSelfMember && nextStatus === 'INACTIVE'
                                      ? 'You cannot deactivate your own account'
                                      : undefined
                                  }
                                  onClick={() =>
                                    toggleMemberStatusMutation.mutate({
                                      member: row.member,
                                      status: nextStatus,
                                    })
                                  }
                                  className={
                                    nextStatus === 'ACTIVE'
                                      ? 'rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'
                                      : 'rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-60'
                                  }
                                >
                                  {isUpdatingThisMember ? 'Updating...' : statusActionLabel}
                                </button>
                                {isTeacher(row.member) ? (
                                  <button
                                    type="button"
                                    onClick={() => openAssignCourses(row.member)}
                                    className="rounded-md bg-brand-500 px-2 py-1 text-xs font-semibold text-white"
                                  >
                                    Assign subject
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      kind: 'MEMBER',
                                      id: row.member.id,
                                      label: formatMemberName(row.member),
                                    })
                                  }
                                  className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                                >
                                  Delete
                                </button>
                              </>
                            );
                          })()
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                kind: 'INVITE',
                                id: row.invite.id,
                                label: row.invite.email,
                              })
                            }
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionCard>

      <Modal
        open={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          inviteMutation.reset();
        }}
        title="Add Staff Invite"
        description="Create an invite and send acceptance instructions by email."
      >
        <form
          className="grid gap-3"
          onSubmit={inviteForm.handleSubmit((values) => inviteMutation.mutate(values))}
        >
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Email
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="teacher@school.rw"
              {...inviteForm.register('email')}
            />
          </label>
          {inviteForm.formState.errors.email ? (
            <p className="text-xs text-red-700">{inviteForm.formState.errors.email.message}</p>
          ) : null}

          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Role name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="TEACHER"
              {...inviteForm.register('roleName')}
            />
          </label>
          {inviteForm.formState.errors.roleName ? (
            <p className="text-xs text-red-700">{inviteForm.formState.errors.roleName.message}</p>
          ) : null}

          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Expires in days
            <input
              type="number"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...inviteForm.register('expiresInDays', { valueAsNumber: true })}
            />
          </label>
          {inviteForm.formState.errors.expiresInDays ? (
            <p className="text-xs text-red-700">{inviteForm.formState.errors.expiresInDays.message}</p>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {inviteMutation.isPending ? 'Creating...' : 'Create invite'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedMemberForEdit)}
        onClose={() => setSelectedMemberForEdit(null)}
        title="Edit staff member"
        description="Update profile and account status."
      >
        <form
          className="grid gap-3"
          onSubmit={editForm.handleSubmit((values) => updateMemberMutation.mutate(values))}
        >
          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            First name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...editForm.register('firstName')}
            />
          </label>
          {editForm.formState.errors.firstName ? (
            <p className="text-xs text-red-700">{editForm.formState.errors.firstName.message}</p>
          ) : null}

          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Last name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...editForm.register('lastName')}
            />
          </label>
          {editForm.formState.errors.lastName ? (
            <p className="text-xs text-red-700">{editForm.formState.errors.lastName.message}</p>
          ) : null}

          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Phone
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="Optional phone"
              {...editForm.register('phone')}
            />
          </label>
          {editForm.formState.errors.phone ? (
            <p className="text-xs text-red-700">{editForm.formState.errors.phone.message}</p>
          ) : null}

          <label className="grid gap-1 text-sm font-semibold text-slate-800">
            Status
            <select
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...editForm.register('status')}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedMemberForEdit(null)}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMemberMutation.isPending}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {updateMemberMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Delete"
        description="This action is permanent for the current staff record."
      >
        <p className="text-sm text-slate-800">
          Delete <strong>{deleteTarget?.label}</strong>?
        </p>
        {deleteError ? <p className="mt-2 text-xs text-red-700">{deleteError}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={async () => {
              if (!deleteTarget) {
                return;
              }
              await deleteMutation.mutateAsync(deleteTarget);
            }}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>

      <Modal
        open={Boolean(selectedMemberForView)}
        onClose={() => setSelectedMemberForView(null)}
        title={viewedMember ? `${formatMemberName(viewedMember)} details` : 'Staff details'}
        description="Profile details and teacher course assignments."
      >
        {memberDetailQuery.isPending ? (
          <div className="grid gap-2" role="status" aria-live="polite">
            <div className="h-8 animate-pulse rounded-lg bg-brand-100" />
            <div className="h-8 animate-pulse rounded-lg bg-brand-100" />
          </div>
        ) : null}

        {memberDetailQuery.isError ? (
          <StateView
            title="Could not load staff details"
            message="Retry to view profile details and assigned courses."
            action={
              <button
                type="button"
                onClick={() => void memberDetailQuery.refetch()}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            }
          />
        ) : null}

        {viewedMember && !memberDetailQuery.isPending && !memberDetailQuery.isError ? (
          <div className="grid gap-4">
            <div className="grid gap-2 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm">
              <p>
                <span className="font-semibold text-slate-800">Name:</span> {formatMemberName(viewedMember)}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Email:</span> {viewedMember.email}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Phone:</span> {viewedMember.phone ?? '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Roles:</span> {viewedMember.roles.join(', ')}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Status:</span> {viewedMember.status}
              </p>
            </div>

            {viewedMemberIsTeacher ? (
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Assigned courses</p>
                  <button
                    type="button"
                    onClick={() => void teacherAssignedCoursesQuery.refetch()}
                    className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-slate-700"
                  >
                    Refresh
                  </button>
                </div>

                {teacherAssignedCoursesQuery.isPending ? (
                  <div className="grid gap-2" role="status" aria-live="polite">
                    <div className="h-8 animate-pulse rounded-lg bg-brand-100" />
                    <div className="h-8 animate-pulse rounded-lg bg-brand-100" />
                  </div>
                ) : null}

                {teacherAssignedCoursesQuery.isError ? (
                  <StateView
                    title="Could not load assigned courses"
                    message="Retry loading teacher assignments."
                    action={
                      <button
                        type="button"
                        onClick={() => void teacherAssignedCoursesQuery.refetch()}
                        className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Retry
                      </button>
                    }
                  />
                ) : null}

                {!teacherAssignedCoursesQuery.isPending &&
                !teacherAssignedCoursesQuery.isError &&
                !(teacherAssignedCoursesQuery.data?.items.length ?? 0) ? (
                  <EmptyState message="No courses assigned yet for this teacher." />
                ) : null}

                {!teacherAssignedCoursesQuery.isPending &&
                !teacherAssignedCoursesQuery.isError &&
                (teacherAssignedCoursesQuery.data?.items.length ?? 0) > 0 ? (
                  <div className="w-full overflow-x-auto rounded-xl border border-brand-100">
                    <table className="w-full min-w-full table-auto text-left text-sm">
                      <thead>
                        <tr className="border-b border-brand-100 text-slate-700">
                          <th className="px-2 py-2 font-semibold">Course</th>
                          <th className="px-2 py-2 font-semibold">Subject</th>
                          <th className="px-2 py-2 font-semibold">Class</th>
                          <th className="px-2 py-2 font-semibold">Academic year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherAssignedCoursesQuery.data?.items.map((course) => (
                          <tr key={course.id} className="border-b border-brand-50">
                            <td className="px-2 py-2">{course.title}</td>
                            <td className="px-2 py-2">{course.subject?.name ?? '-'}</td>
                            <td className="px-2 py-2">{course.classRoom.name}</td>
                            <td className="px-2 py-2">{course.academicYear.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {teacherAssignedCoursesQuery.data?.pagination.totalPages &&
                teacherAssignedCoursesQuery.data.pagination.totalPages > 1 ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={detailCoursePage <= 1}
                      onClick={() => setDetailCoursePage((current) => Math.max(1, current - 1))}
                      className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={detailCoursePage >= teacherAssignedCoursesQuery.data.pagination.totalPages}
                      onClick={() =>
                        setDetailCoursePage((current) =>
                          Math.min(teacherAssignedCoursesQuery.data!.pagination.totalPages, current + 1),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedTeacherForAssign)}
        onClose={closeAssignSubjectModal}
        title={
          selectedTeacherForAssign
            ? `Assign subject to ${formatMemberName(selectedTeacherForAssign)}`
            : 'Assign subject'
        }
        description="Type to search and select academic year, class, and subject."
      >
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/80 p-3 md:grid-cols-2 xl:grid-cols-3">
            <SearchableSelect
              label="Academic year"
              value={assignYearText}
              selectedId={assignYearId}
              options={academicYearOptions}
              placeholder="Type or select academic year"
              ariaLabel="Select academic year"
              onInputChange={(value) =>
                updateSearchableSelection(
                  value,
                  academicYearOptions,
                  setAssignYearText,
                  setAssignYearId,
                )
              }
              onOptionSelect={(option) => {
                setAssignYearText(option.label);
                setAssignYearId(option.id);
              }}
            />

            <SearchableSelect
              label="Class"
              value={assignClassText}
              selectedId={assignClassId}
              options={classOptions}
              placeholder="Type or select class"
              ariaLabel="Select class"
              onInputChange={(value) =>
                updateSearchableSelection(value, classOptions, setAssignClassText, setAssignClassId)
              }
              onOptionSelect={(option) => {
                setAssignClassText(option.label);
                setAssignClassId(option.id);
              }}
            />

            <SearchableSelect
              label="Subject"
              value={assignSubjectText}
              selectedId={assignSubjectId}
              options={subjectOptions}
              placeholder="Type or select subject"
              ariaLabel="Select subject"
              onInputChange={(value) =>
                updateSearchableSelection(
                  value,
                  subjectOptions,
                  setAssignSubjectText,
                  setAssignSubjectId,
                )
              }
              onOptionSelect={(option) => {
                setAssignSubjectText(option.label);
                setAssignSubjectId(option.id);
              }}
            />
          </div>

          <p className="text-xs text-slate-500">
            Start typing in each field, then pick one of the suggestions.
          </p>

          {academicYearsQuery.isError || classRoomsQuery.isError || subjectsQuery.isError ? (
            <StateView
              title="Could not load assignment options"
              message="Retry loading academic years, classes, and subjects."
              action={
                <button
                  type="button"
                  onClick={() => {
                    void academicYearsQuery.refetch();
                    void classRoomsQuery.refetch();
                    void subjectsQuery.refetch();
                  }}
                  className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              }
            />
          ) : null}

          {selectedSubjectCourseQuery.isPending &&
          assignYearId &&
          assignClassId &&
          assignSubjectId ? (
            <div className="grid gap-2" role="status" aria-live="polite">
              <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
            </div>
          ) : null}

          {selectedSubjectCourseQuery.isError &&
          assignYearId &&
          assignClassId &&
          assignSubjectId ? (
            <StateView
              title="Could not load current subject assignment"
              message="Retry loading the selected subject assignment."
              action={
                <button
                  type="button"
                  onClick={() => void selectedSubjectCourseQuery.refetch()}
                  className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              }
            />
          ) : null}

          {assignYearId && assignClassId && assignSubjectId ? (
            <div className="rounded-xl border border-brand-100 bg-white p-3">
              {selectedSubjectCourse ? (
                <div className="grid gap-1 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{selectedSubjectCourse.subject?.name ?? 'Subject selected'}</p>
                  <p>
                    {selectedSubjectCourse.classRoom.name} | {selectedSubjectCourse.academicYear.name}
                  </p>
                  <p>
                    Current teacher: {selectedSubjectCourse.teacher.firstName} {selectedSubjectCourse.teacher.lastName}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-700">
                  No course exists yet for this subject/class/year. Assigning will create it automatically.
                </p>
              )}
            </div>
          ) : null}

          {assignFormError ? (
            <p className="text-xs text-red-700">{assignFormError}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeAssignSubjectModal}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={assignSubjectMutation.isPending || !selectedTeacherForAssign}
              onClick={() => {
                if (!selectedTeacherForAssign) {
                  return;
                }

                if (!assignYearId || !assignClassId || !assignSubjectId) {
                  setAssignFormError('Select academic year, class, and subject from the suggestions.');
                  return;
                }

                setAssignFormError(null);
                assignSubjectMutation.mutate({
                  teacherUserId: selectedTeacherForAssign.id,
                  academicYearId: assignYearId,
                  classRoomId: assignClassId,
                  subjectId: assignSubjectId,
                });
              }}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {assignSubjectMutation.isPending ? 'Assigning...' : 'Assign subject'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
