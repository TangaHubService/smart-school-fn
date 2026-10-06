import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Book, Send } from 'lucide-react';
import { useState } from 'react';

import { SectionCard } from '../components/section-card';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { uploadFileToCloudinary } from '../features/sprint4/cloudinary-upload';
import {
  getTicketApi,
  listTicketsApi,
  replyTicketApi,
  createTicketApi,
  updateTicketApi,
  uploadTicketFiles,
  validateTicketFiles,
  type SupportTicket,
} from '../features/support/support.api';

const FAQ = [
  {
    id: '1',
    q: 'How do I add a new school?',
    a: 'Go to Schools Management and click Create School.',
  },
  {
    id: '2',
    q: 'How do I reset a user password?',
    a: 'Use User Management to send a password reset email.',
  },
  {
    id: '3',
    q: 'How do I export reports?',
    a: 'Go to Reports & Analytics and use the Export button.',
  },
  {
    id: '4',
    q: 'Who do I contact for billing?',
    a: 'Email billing@smartschool.rw for billing inquiries.',
  },
];

export function SupportCenterPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const token = auth.accessToken ?? '';

  const ticketsQuery = useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: () => listTicketsApi(token, { page: 1, pageSize: 20 }),
    enabled: Boolean(token),
  });

  const openTicketQuery = useQuery({
    queryKey: ['support', 'ticket', openTicketId],
    queryFn: () => getTicketApi(token, openTicketId!),
    enabled: Boolean(token && openTicketId),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Secure upload first (Cloudinary, purpose 'support'), then link file
      // URLs to the ticket. Upload failures degrade to metadata-only entries.
      setUploading(true);
      try {
        const attachments = files.length
          ? await uploadTicketFiles(token, files, uploadFileToCloudinary)
          : undefined;
        return createTicketApi(token, {
          subject: subject.trim(),
          message: message.trim(),
          attachments,
        });
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (ticket: SupportTicket) => {
      setSubject('');
      setMessage('');
      setFiles([]);
      setOpenTicketId(ticket.id);
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      showToast({ type: 'success', title: 'Ticket created', message: ticket.ticketNumber });
    },
    onError: (err: unknown) => {
      showToast({
        type: 'error',
        title: 'Could not create ticket',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const fileError = validateTicketFiles(replyFiles);
      if (fileError) throw new Error(fileError);
      setUploading(true);
      try {
        const attachments = replyFiles.length
          ? await uploadTicketFiles(token, replyFiles, uploadFileToCloudinary)
          : undefined;
        return replyTicketApi(token, openTicketId!, { body: replyBody.trim(), attachments });
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      setReplyBody('');
      setReplyFiles([]);
      queryClient.invalidateQueries({ queryKey: ['support', 'ticket', openTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
    onError: (err: unknown) => {
      showToast({
        type: 'error',
        title: 'Could not send reply',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') =>
      updateTicketApi(token, openTicketId!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'ticket', openTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || message.trim().length < 10) {
      showToast({ type: 'error', title: 'Invalid ticket', message: 'Subject and a 10+ character message are required.' });
      return;
    }
    const fileError = validateTicketFiles(files);
    if (fileError) {
      showToast({ type: 'error', title: 'Invalid attachments', message: fileError });
      return;
    }
    createMutation.mutate();
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Support Center</h1>
        <p className="mt-1 text-sm text-slate-600">FAQs, ticket list, replies and resolution.</p>
      </div>

      <SectionCard title="Frequently Asked Questions" subtitle="Quick answers">
        <div className="space-y-4">
          {FAQ.map((item) => (
            <details key={item.id} className="group rounded-lg border border-brand-100 bg-white">
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-medium text-slate-900">
                <Book className="h-4 w-4 shrink-0 text-brand-500" />
                {item.q}
              </summary>
              <p className="border-t border-brand-50 px-4 py-3 text-sm text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Create Ticket" subtitle="User → Help Desk">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="mt-1 h-10 w-full rounded-lg border border-brand-200 px-3 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={4}
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Attachments (optional, max 5, 10MB each)
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
                className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-1.5 text-sm"
              />
              {files.length > 0 && (
                <ul className="mt-1 space-y-1 text-xs text-slate-600">
                  {files.map((f) => (
                    <li key={`${f.name}-${f.size}`}>{f.name}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {uploading ? 'Uploading…' : createMutation.isPending ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Ticket List" subtitle="Open → Respond → Resolve/Close">
          {ticketsQuery.isPending && <p className="text-sm text-slate-500">Loading tickets…</p>}
          {ticketsQuery.isError && (
            <div className="text-sm text-red-600">
              Could not load tickets.{' '}
              <button className="underline" onClick={() => ticketsQuery.refetch()}>
                Retry
              </button>
            </div>
          )}
          {ticketsQuery.data && ticketsQuery.data.data.length === 0 && (
            <p className="text-sm text-slate-500">No tickets yet. Create the first one.</p>
          )}
          <ul className="space-y-2">
            {(ticketsQuery.data?.data ?? []).map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setOpenTicketId(t.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                    openTicketId === t.id ? 'border-brand-400 bg-brand-50' : 'border-brand-100'
                  }`}
                >
                  <span className="font-semibold">{t.ticketNumber}</span> · {t.subject}
                  <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs">{t.status}</span>
                  <span className="ml-1 text-xs text-slate-500">
                    {new Date(t.createdAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {openTicketQuery.data && (
        <SectionCard
          title={`Ticket ${openTicketQuery.data.ticketNumber}`}
          subtitle={`${openTicketQuery.data.subject} · ${openTicketQuery.data.status}`}
        >
          <p className="text-sm text-slate-700">{openTicketQuery.data.message}</p>
          {openTicketQuery.data.attachments.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {openTicketQuery.data.attachments.map((a) => (
                <li key={a.id}>
                  {a.fileUrl ? (
                    <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                      {a.originalName}
                    </a>
                  ) : (
                    <span>{a.originalName}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 space-y-2 border-t pt-3">
            {openTicketQuery.data.replies.map((r) => (
              <div key={r.id} className={`rounded-lg p-2 text-sm ${r.isStaffReply ? 'bg-blue-50' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-500">
                  {r.isStaffReply ? 'Staff' : 'User'} · {new Date(r.createdAt).toLocaleString()}
                </p>
                <p>{r.body}</p>
                {r.attachments.length > 0 && (
                  <ul className="mt-1 space-y-1 text-xs">
                    {r.attachments.map((a) => (
                      <li key={a.id}>
                        {a.fileUrl ? (
                          <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                            {a.originalName}
                          </a>
                        ) : (
                          <span>{a.originalName}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (replyBody.trim()) replyMutation.mutate();
            }}
            className="mt-3 space-y-2"
          >
            <div className="flex gap-2">
              <input
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write a reply…"
                className="h-10 flex-1 rounded-lg border border-brand-200 px-3 text-sm"
              />
              <button
                type="submit"
                disabled={replyMutation.isPending || uploading || !replyBody.trim()}
                className="rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : replyMutation.isPending ? 'Sending…' : 'Reply'}
              </button>
            </div>
            <input
              type="file"
              multiple
              onChange={(e) => setReplyFiles(Array.from(e.target.files ?? []).slice(0, 5))}
              className="w-full rounded-lg border border-brand-200 px-3 py-1.5 text-xs"
              aria-label="Attach files to reply"
            />
            {replyFiles.length > 0 && (
              <p className="text-xs text-slate-500">{replyFiles.map((f) => f.name).join(', ')}</p>
            )}
          </form>
          <div className="mt-3 flex gap-2">
            {(['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => statusMutation.mutate(s)}
                disabled={statusMutation.isPending}
                className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold hover:bg-brand-50"
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </SectionCard>
      )}
    </section>
  );
}
