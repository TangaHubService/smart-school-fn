import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, LogOut, MessageSquarePlus, Pencil, Search, UserPlus, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ChatAvatar, ChatThread, initials } from '../components/chat/chat-thread';
import { AppDrawer } from '../components/drawer';
import { ListSkeleton } from '../components/skeleton-loader';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { getSessionAccessToken, refreshSessionTokens } from '../features/auth/auth.session';
import {
  addGroupMembersApi,
  createGroupChatApi,
  getChatApi,
  listChatContactsApi,
  listMyChatsApi,
  openDirectChatApi,
  removeGroupMemberApi,
  updateGroupChatApi,
  type ChatContact,
  type ChatListItem,
} from '../features/chat/chat.api';
import { ApiClientError } from '../types/api';
import socket from '../utils/socket';

type Filter = 'all' | 'unread' | 'groups';

function listTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (now.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** WhatsApp-style messenger for students: class chats, groups and direct messages. */
export function StudentMessengerPage() {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const myId = auth.me?.id;

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [picker, setPicker] = useState<null | 'direct' | 'group'>(null);
  const [showInfo, setShowInfo] = useState(false);

  const chatsQuery = useQuery({
    queryKey: ['my-chats'],
    queryFn: () => listMyChatsApi(auth.accessToken!),
    enabled: Boolean(auth.accessToken),
    refetchInterval: 60000,
  });

  const chatQuery = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChatApi(auth.accessToken!, chatId!),
    enabled: Boolean(auth.accessToken && chatId),
    retry: false,
  });

  // Personal inbox room: the chat list updates live when anyone writes to you.
  useEffect(() => {
    if (!auth.accessToken) return;
    let retriedAfterRefresh = false;
    // Always send the newest token: access tokens expire after 15 minutes, and the
    // socket may reconnect (sleep, server restart) long after this page loaded.
    const join = () => {
      const token = getSessionAccessToken();
      if (token) socket.emit('inbox:join', { token });
    };
    const onConnect = () => {
      retriedAfterRefresh = false;
      join();
    };
    const onRejected = ({ reason }: { reason: 'expired' | 'invalid' }) => {
      if (reason !== 'expired' || retriedAfterRefresh) return;
      retriedAfterRefresh = true;
      refreshSessionTokens()
        .then(join)
        .catch(() => undefined); // Session is over; the app will send the user to login.
    };
    const onInbox = () => void queryClient.invalidateQueries({ queryKey: ['my-chats'] });
    const onUpdated = ({ chatId: cid }: { chatId: string }) =>
      void queryClient.invalidateQueries({ queryKey: ['chat', cid] });

    // Join now if connected; otherwise the 'connect' handler joins (avoids joining twice).
    if (socket.connected) join();
    socket.on('connect', onConnect);
    socket.on('inbox:rejected', onRejected);
    socket.on('chat:inbox', onInbox);
    socket.on('chat:updated', onUpdated);
    return () => {
      socket.off('connect', onConnect);
      socket.off('inbox:rejected', onRejected);
      socket.off('chat:inbox', onInbox);
      socket.off('chat:updated', onUpdated);
    };
  }, [auth.accessToken, queryClient]);

  useEffect(() => setShowInfo(false), [chatId]);

  const chats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (chatsQuery.data ?? []).filter((c) => {
      if (filter === 'unread' && c.unreadCount === 0) return false;
      if (filter === 'groups' && c.type === 'DIRECT') return false;
      return !q || c.title.toLowerCase().includes(q);
    });
  }, [chatsQuery.data, filter, search]);

  const totalUnread = (chatsQuery.data ?? []).reduce((sum, c) => sum + c.unreadCount, 0);

  function preview(chat: ChatListItem) {
    if (!chat.lastMessage) return chat.type === 'DIRECT' ? 'Start the conversation' : 'No messages yet';
    const who =
      chat.lastMessage.sender.id === myId
        ? 'You: '
        : chat.type === 'DIRECT'
          ? ''
          : `${chat.lastMessage.sender.firstName}: `;
    return `${who}${chat.lastMessage.preview}`;
  }

  const listPanel = (
    <aside
      className={`flex min-h-0 flex-col border-r border-slate-200 bg-white md:w-[360px] md:shrink-0 ${
        chatId ? 'hidden md:flex' : 'flex w-full'
      }`}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h1 className="text-xl font-bold text-slate-900">
          Chats
          {totalUnread > 0 ? (
            <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 align-middle text-xs font-semibold text-white">
              {totalUnread}
            </span>
          ) : null}
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPicker('group')}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
            aria-label="New group"
            title="New group"
          >
            <Users className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setPicker('direct')}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
            aria-label="New chat"
            title="New chat"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="mt-2 flex gap-2">
          {(['all', 'unread', 'groups'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                filter === f ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {chatsQuery.isPending ? (
          <div className="px-3">
            <ListSkeleton rows={6} />
          </div>
        ) : chatsQuery.isError ? (
          <p className="px-4 py-6 text-sm text-red-600">{(chatsQuery.error as ApiClientError).message}</p>
        ) : chats.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            {search || filter !== 'all' ? 'No chats match.' : 'No chats yet. Start one with a classmate.'}
            {!search && filter === 'all' ? (
              <button
                type="button"
                onClick={() => setPicker('direct')}
                className="mx-auto mt-3 block rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                New chat
              </button>
            ) : null}
          </div>
        ) : (
          <ul>
            {chats.map((chat) => {
              const active = chat.id === chatId;
              return (
                <li key={chat.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/student/chat/${chat.id}`)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                      active ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <ChatAvatar title={chat.title} type={chat.type} />
                    <span className="min-w-0 flex-1 border-b border-slate-100 pb-2.5">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-medium text-slate-900">{chat.title}</span>
                        <span
                          className={`shrink-0 text-xs ${chat.unreadCount ? 'font-semibold text-emerald-600' : 'text-slate-400'}`}
                        >
                          {chat.lastMessage ? listTime(chat.lastMessage.createdAt) : ''}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-slate-500">
                          {chat.type === 'CLASS' ? <span className="mr-1 text-brand-600">Class ·</span> : null}
                          {preview(chat)}
                        </span>
                        {chat.unreadCount > 0 ? (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold text-white">
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );

  let threadPanel;
  if (!chatId) {
    threadPanel = (
      <section className="hidden flex-1 flex-col items-center justify-center gap-3 bg-[#f0f2f5] text-center md:flex">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-emerald-600 shadow-sm">
          <MessageSquarePlus className="h-9 w-9" />
        </span>
        <h2 className="text-xl font-semibold text-slate-800">Smart School Chat</h2>
        <p className="max-w-sm text-sm text-slate-500">
          Chat with your class, create study groups, or message a classmate directly. Pick a chat on the left to begin.
        </p>
      </section>
    );
  } else if (chatQuery.isError) {
    threadPanel = (
      <section className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#f0f2f5] p-6 text-center">
        <p className="text-sm text-slate-600">{(chatQuery.error as ApiClientError).message}</p>
        <button
          type="button"
          onClick={() => navigate('/student/chat')}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
        >
          Back to chats
        </button>
      </section>
    );
  } else if (!chatQuery.data) {
    threadPanel = (
      <section className="flex flex-1 items-center justify-center bg-[#f0f2f5]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </section>
    );
  } else {
    threadPanel = (
      <section className="flex min-w-0 flex-1 flex-col">
        <ChatThread
          chat={chatQuery.data}
          onBack={() => navigate('/student/chat')}
          onOpenInfo={() => setShowInfo(true)}
        />
      </section>
    );
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      {listPanel}
      {threadPanel}

      {picker ? (
        <ContactPicker
          mode={picker}
          onClose={() => setPicker(null)}
          onDone={(id) => {
            setPicker(null);
            void queryClient.invalidateQueries({ queryKey: ['my-chats'] });
            navigate(`/student/chat/${id}`);
          }}
        />
      ) : null}

      {showInfo && chatQuery.data ? (
        <ChatInfoDrawer
          chatId={chatQuery.data.id}
          onClose={() => setShowInfo(false)}
          onLeft={() => {
            setShowInfo(false);
            void queryClient.invalidateQueries({ queryKey: ['my-chats'] });
            navigate('/student/chat');
          }}
          onMessage={(userId) => {
            void openDirectChatApi(auth.accessToken!, userId).then((r) => navigate(`/student/chat/${r.id}`));
          }}
        />
      ) : null}
    </div>
  );
}

/** Search classmates; start a direct chat, or pick several to create a group. */
function ContactPicker({
  mode,
  onClose,
  onDone,
  excludeIds = [],
  onAdd,
}: {
  mode: 'direct' | 'group' | 'add';
  onClose: () => void;
  onDone?: (chatId: string) => void;
  excludeIds?: string[];
  onAdd?: (userIds: string[]) => Promise<unknown>;
}) {
  const auth = useAuth();
  const { showToast } = useToast();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<ChatContact[]>([]);
  const [step, setStep] = useState<'pick' | 'name'>('pick');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const contactsQuery = useQuery({
    queryKey: ['chat-contacts', debounced],
    queryFn: () => listChatContactsApi(auth.accessToken!, debounced || undefined),
    enabled: Boolean(auth.accessToken),
  });
  const contacts = (contactsQuery.data ?? []).filter((c) => !excludeIds.includes(c.id));

  const directMutation = useMutation({
    mutationFn: (userId: string) => openDirectChatApi(auth.accessToken!, userId),
    onSuccess: (r) => onDone?.(r.id),
    onError: (e) => showToast({ type: 'error', title: 'Could not open chat', message: (e as ApiClientError).message }),
  });
  const groupMutation = useMutation({
    mutationFn: () =>
      createGroupChatApi(auth.accessToken!, {
        title: title.trim(),
        description: description.trim() || undefined,
        memberUserIds: selected.map((s) => s.id),
      }),
    onSuccess: (r) => onDone?.(r.id),
    onError: (e) => showToast({ type: 'error', title: 'Could not create group', message: (e as ApiClientError).message }),
  });
  const addMutation = useMutation({
    mutationFn: () => onAdd!(selected.map((s) => s.id)),
    onSuccess: onClose,
    onError: (e) => showToast({ type: 'error', title: 'Could not add', message: (e as ApiClientError).message }),
  });

  function toggle(contact: ChatContact) {
    setSelected((prev) =>
      prev.some((p) => p.id === contact.id) ? prev.filter((p) => p.id !== contact.id) : [...prev, contact]
    );
  }

  const multi = mode !== 'direct';
  const heading = mode === 'direct' ? 'New chat' : mode === 'group' ? (step === 'pick' ? 'New group' : 'Name your group') : 'Add members';

  const footer = multi ? (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{selected.length} selected</span>
      {mode === 'group' && step === 'pick' ? (
        <button
          type="button"
          disabled={!selected.length}
          onClick={() => setStep('name')}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Next
        </button>
      ) : mode === 'group' ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep('pick')} className="rounded-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Back
          </button>
          <button
            type="button"
            disabled={!title.trim() || groupMutation.isPending}
            onClick={() => groupMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            {groupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Create group
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!selected.length || addMutation.isPending}
          onClick={() => addMutation.mutate()}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Add
        </button>
      )}
    </div>
  ) : undefined;

  return (
    <AppDrawer open title={heading} onClose={onClose} footer={footer} size="compact">
      {mode === 'group' && step === 'name' ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Group name
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="e.g. Maths study group"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((s) => (
              <span key={s.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                {s.firstName} {s.lastName}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {multi && selected.length ? (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s)}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                >
                  {s.firstName} {s.lastName} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              autoFocus
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search classmates by name or code"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          {contactsQuery.isPending ? (
            <ListSkeleton rows={5} />
          ) : contacts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No classmates found.</p>
          ) : (
            <ul className="-mx-2">
              {contacts.map((c) => {
                const isSelected = selected.some((s) => s.id === c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={directMutation.isPending}
                      onClick={() => (multi ? toggle(c) : directMutation.mutate(c.id))}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                        {initials(c.firstName, c.lastName)}
                        {isSelected ? (
                          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-emerald-600 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{c.className ?? 'Student'}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </AppDrawer>
  );
}

/** Group / contact info: members, rename, add people, leave. */
function ChatInfoDrawer({
  chatId,
  onClose,
  onLeft,
  onMessage,
}: {
  chatId: string;
  onClose: () => void;
  onLeft: () => void;
  onMessage: (userId: string) => void;
}) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');

  const chatQuery = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChatApi(auth.accessToken!, chatId),
    enabled: Boolean(auth.accessToken),
  });
  const chat = chatQuery.data;
  const members = chat?.members ?? [];
  const myId = auth.me?.id;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
    void queryClient.invalidateQueries({ queryKey: ['my-chats'] });
  };

  const renameMutation = useMutation({
    mutationFn: () => updateGroupChatApi(auth.accessToken!, chatId, { title: title.trim() }),
    onSuccess: () => {
      setEditing(false);
      refresh();
    },
    onError: (e) => showToast({ type: 'error', title: 'Could not rename', message: (e as ApiClientError).message }),
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeGroupMemberApi(auth.accessToken!, chatId, userId),
    onSuccess: (_r, userId) => (userId === myId ? onLeft() : refresh()),
    onError: (e) => showToast({ type: 'error', title: 'Could not update group', message: (e as ApiClientError).message }),
  });

  if (!chat) {
    return (
      <AppDrawer open title="Chat info" onClose={onClose} isLoading>
        {null}
      </AppDrawer>
    );
  }

  const isGroup = chat.type === 'GROUP';
  const canManage = Boolean(chat.permissions.canManageMembers);

  return (
    <AppDrawer
      open
      title={chat.type === 'DIRECT' ? 'Contact info' : chat.type === 'CLASS' ? 'Class chat info' : 'Group info'}
      onClose={onClose}
    >
      <div className="flex flex-col items-center gap-2 border-b border-slate-100 pb-5 text-center">
        <span className="scale-150 py-3">
          <ChatAvatar title={chat.title} type={chat.type} />
        </span>
        {editing ? (
          <div className="flex w-full items-center gap-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              disabled={!title.trim() || renameMutation.isPending}
              onClick={() => renameMutation.mutate()}
              className="rounded-full bg-emerald-600 p-2 text-white disabled:bg-slate-300"
              aria-label="Save name"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            {chat.title}
            {canManage ? (
              <button
                type="button"
                onClick={() => {
                  setTitle(chat.title);
                  setEditing(true);
                }}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Rename group"
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
          </h3>
        )}
        <p className="text-sm text-slate-500">
          {chat.type === 'DIRECT' ? 'Direct message' : `${members.length} members`}
        </p>
        {chat.description ? <p className="text-sm text-slate-600">{chat.description}</p> : null}
      </div>

      {chat.type !== 'DIRECT' ? (
        <div className="pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700">Members</h4>
            {canManage ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
              >
                <UserPlus className="h-4 w-4" /> Add
              </button>
            ) : null}
          </div>
          <ul className="-mx-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                  {initials(m.firstName, m.lastName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {m.id === myId ? 'You' : `${m.firstName} ${m.lastName}`}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {m.role === 'TEACHER' ? 'Teacher' : m.isAdmin ? 'Group admin' : 'Student'}
                  </span>
                </span>
                {m.id !== myId && m.role === 'STUDENT' ? (
                  <button
                    type="button"
                    onClick={() => onMessage(m.id)}
                    className="rounded-full px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    Message
                  </button>
                ) : null}
                {canManage && m.id !== myId ? (
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate(m.id)}
                    className="rounded-full px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isGroup && myId ? (
        <button
          type="button"
          onClick={() => removeMutation.mutate(myId)}
          disabled={removeMutation.isPending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" /> Exit group
        </button>
      ) : null}

      {adding ? (
        <ContactPicker
          mode="add"
          excludeIds={members.map((m) => m.id)}
          onClose={() => setAdding(false)}
          onAdd={async (userIds) => {
            await addGroupMembersApi(auth.accessToken!, chatId, userIds);
            refresh();
          }}
        />
      ) : null}
    </AppDrawer>
  );
}
