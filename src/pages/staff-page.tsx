import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Modal } from '../components/modal';
import { SectionCard } from '../components/section-card';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { inviteStaffApi, listInvitesApi, revokeInviteApi } from '../features/sprint1/sprint1.api';
import { ApiClientError } from '../types/api';

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  roleName: z.string().trim().min(2).max(60),
  expiresInDays: z.coerce.number().int().min(1).max(14).default(7),
});

type InviteForm = z.infer<typeof inviteSchema>;

const defaultInviteValues: InviteForm = {
  email: '',
  roleName: 'TEACHER',
  expiresInDays: 7,
};

export function StaffPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteToDelete, setInviteToDelete] = useState<{ id: string; email: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: defaultInviteValues,
  });

  const invitesQuery = useQuery({
    queryKey: ['staff-invites'],
    queryFn: () => listInvitesApi(auth.accessToken!),
  });

  const inviteMutation = useMutation({
    mutationFn: (values: InviteForm) => inviteStaffApi(auth.accessToken!, values),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites'] });
      form.reset(defaultInviteValues);
      const email = (result as any).email ?? 'staff member';
      setInviteFeedback(`Invitation email sent to ${email}. The user should check inbox to accept.`);
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

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) => revokeInviteApi(auth.accessToken!, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites'] });
      showToast({
        type: 'success',
        title: 'Invite deleted',
        message: 'Pending invite has been revoked.',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Could not delete invite',
        message: error instanceof Error ? error.message : 'Delete failed',
      });
    },
  });

  const invites = ((invitesQuery.data as any[]) ?? []) as any[];

  const filteredInvites = useMemo(() => {
    const query = filterText.trim().toLowerCase();

    return invites.filter((invite) => {
      const matchesText =
        !query ||
        `${invite.email} ${invite.role?.name ?? ''} ${invite.status}`
          .toLowerCase()
          .includes(query);

      const matchesStatus = statusFilter === 'ALL' || invite.status === statusFilter;

      return matchesText && matchesStatus;
    });
  }, [invites, filterText, statusFilter]);

  return (
    <SectionCard
      title="Staff"
      subtitle="Invite teachers and administrators, then track invite status."
      action={
        <button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Add staff invite
        </button>
      }
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
        <input
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder="Filter by email, role, status"
          className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
          aria-label="Filter staff invites"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:border-brand-400"
          aria-label="Filter invite status"
        >
          <option value="ALL">All status</option>
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="EXPIRED">Expired</option>
          <option value="REVOKED">Revoked</option>
        </select>

        <button
          type="button"
          onClick={() => void invitesQuery.refetch()}
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
        >
          Refresh
        </button>
      </div>

      {inviteFeedback ? (
        <StateView title="Invite created" message={inviteFeedback} />
      ) : null}

      {invitesQuery.isPending ? (
        <div className="grid gap-2" role="status" aria-live="polite">
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
          <div className="h-10 animate-pulse rounded-lg bg-brand-100" />
        </div>
      ) : null}

      {invitesQuery.isError ? (
        <StateView
          title="Could not load staff invites"
          message="Please retry."
          action={
            <button
              type="button"
              onClick={() => void invitesQuery.refetch()}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!invitesQuery.isPending && !invitesQuery.isError && !filteredInvites.length ? (
        <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">No staff invites found.</p>
      ) : null}

      {!invitesQuery.isPending && !invitesQuery.isError && filteredInvites.length ? (
        <div className="overflow-x-auto rounded-xl border border-brand-100">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-brand-700">
                <th className="px-2 py-2 font-semibold">#</th>
                <th className="px-2 py-2 font-semibold">Email</th>
                <th className="px-2 py-2 font-semibold">Role</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Expires</th>
                <th className="px-2 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvites.map((invite, index) => (
                <tr key={invite.id} className="border-b border-brand-50">
                  <td className="px-2 py-2 align-middle text-brand-600">{index + 1}</td>
                  <td className="px-2 py-2 align-middle">{invite.email}</td>
                  <td className="px-2 py-2 align-middle">{invite.role?.name}</td>
                  <td className="px-2 py-2 align-middle">{invite.status}</td>
                  <td className="px-2 py-2 align-middle">{String(invite.expiresAt).slice(0, 10)}</td>
                  <td className="px-2 py-2 align-middle">
                    {invite.status === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setInviteToDelete({ id: invite.id, email: invite.email });
                        }}
                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="text-xs text-brand-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal
        open={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          inviteMutation.reset();
        }}
        title="Add Staff Invite"
        description="Create an invite and send acceptance instructions by email."
      >
        <form className="grid gap-3" onSubmit={form.handleSubmit((values) => inviteMutation.mutate(values))}>
          <label className="grid gap-1 text-sm font-semibold text-brand-800">
            Email
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="teacher@school.rw"
              {...form.register('email')}
            />
          </label>
          {form.formState.errors.email ? (
            <p className="text-xs text-red-700">{form.formState.errors.email.message}</p>
          ) : null}

          <label className="grid gap-1 text-sm font-semibold text-brand-800">
            Role name
            <input
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="TEACHER"
              {...form.register('roleName')}
            />
          </label>
          {form.formState.errors.roleName ? (
            <p className="text-xs text-red-700">{form.formState.errors.roleName.message}</p>
          ) : null}

          <label className="grid gap-1 text-sm font-semibold text-brand-800">
            Expires in days
            <input
              type="number"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              {...form.register('expiresInDays', { valueAsNumber: true })}
            />
          </label>
          {form.formState.errors.expiresInDays ? (
            <p className="text-xs text-red-700">{form.formState.errors.expiresInDays.message}</p>
          ) : null}

          {(inviteMutation.error as ApiClientError | null) ? (
            <p className="text-xs text-red-700" aria-live="polite">
              {(inviteMutation.error as ApiClientError).message}
            </p>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {inviteMutation.isPending ? 'Creating...' : 'Create invite'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(inviteToDelete)}
        onClose={() => setInviteToDelete(null)}
        title="Confirm Delete"
        description="This will revoke the pending invite."
      >
        <p className="text-sm text-brand-800">
          Are you sure you want to delete invite for <strong>{inviteToDelete?.email}</strong>?
        </p>
        {deleteError ? <p className="mt-2 text-xs text-red-700">{deleteError}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setInviteToDelete(null)}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={revokeInviteMutation.isPending}
            onClick={async () => {
              if (!inviteToDelete) {
                return;
              }

              setDeleteError(null);
              try {
                await revokeInviteMutation.mutateAsync(inviteToDelete.id);
                setInviteToDelete(null);
              } catch (error) {
                setDeleteError(error instanceof Error ? error.message : 'Delete failed');
              }
            }}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {revokeInviteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </SectionCard>
  );
}
