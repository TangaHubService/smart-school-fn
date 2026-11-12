import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  FileText,
  Info,
  Loader2,
  Paperclip,
  Pin,
  PinOff,
  Reply,
  Search,
  SendHorizontal,
  SmilePlus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { EmptyState } from '../empty-state';
import { ListSkeleton } from '../skeleton-loader';
import { SecurePdfViewer } from '../secure-pdf-viewer';
import { useToast } from '../toast';
import { useAuth } from '../../features/auth/auth.context';
import { uploadFileToCloudinary } from '../../features/sprint4/cloudinary-upload';
import socket from '../../utils/socket';
import {
  deleteMessageApi,
  getReadReceiptsApi,
  listChatMessagesApi,
  markChatReadApi,
  pinMessageApi,
  reactToMessageApi,
  removeReactionApi,
  sendChatMessageApi,
  unpinMessageApi,
  type ChatMessage,
  type ChatMessagesResponse,
  type ChatRoom,
} from '../../features/chat/chat.api';
import { ApiClientError } from '../../types/api';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const PAGE_STEP = 50;
const MAX_LOADED = 500;
/** Messages from the same person within this window are grouped (name shown once). */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

const NAME_COLORS = [
  'text-rose-600',
  'text-amber-700',
  'text-emerald-700',
  'text-sky-700',
  'text-violet-700',
  'text-fuchsia-700',
  'text-teal-700',
  'text-orange-700',
];

export function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?';
}

function nameColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

function dayLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function ChatAvatar({
  title,
  type,
  size = 'md',
}: {
  title: string;
  type?: ChatRoom['type'];
  size?: 'sm' | 'md';
}) {
  const [first = '', second = ''] = title.split(' ');
  const dims = size === 'sm' ? 'h-10 w-10 text-sm' : 'h-11 w-11 text-sm';
  if (type === 'CLASS' || type === 'GROUP') {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-full ${dims} ${
          type === 'CLASS' ? 'bg-brand-100 text-brand-700' : 'bg-emerald-100 text-emerald-700'
        }`}
        aria-hidden
      >
        <Users className="h-5 w-5" />
      </span>
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-slate-200 font-semibold text-slate-700 ${dims}`}
      aria-hidden
    >
      {initials(first, second)}
    </span>
  );
}

function renderContentWithMentions(
  content: string,
  mentionedUserIds: string[],
  roster: Array<{ id: string; firstName: string }>
) {
  if (!mentionedUserIds.length) return content;
  const names = mentionedUserIds
    .map((id) => roster.find((r) => r.id === id))
    .filter((r): r is { id: string; firstName: string } => Boolean(r));
  if (!names.length) return content;
  const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(${names.map((n) => `@${escape(n.firstName)}`).join('|')})`, 'gi');
  return content.split(pattern).map((part, i) =>
    names.some((n) => part.toLowerCase() === `@${n.firstName}`.toLowerCase()) ? (
      <span key={i} className="font-semibold text-brand-700">
        {part}
      </span>
    ) : (
      part
    )
  );
}

interface ChatThreadProps {
  chat: ChatRoom;
  /** Shown on small screens to go back to the chat list. */
  onBack?: () => void;
  /** Opens group/contact info. */
  onOpenInfo?: () => void;
  /** Rendered under the header (e.g. a notice). */
  banner?: ReactNode;
}

/**
 * One conversation, WhatsApp style: live messages over sockets, replies, reactions,
 * mentions, attachments, read ticks, typing and online indicators.
 */
export function ChatThread({ chat, onBack, onOpenInfo, banner }: ChatThreadProps) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const chatId = chat.id;
  const permissions = chat.permissions;
  const roster = chat.roster;
  const isOneToOne = chat.type === 'DIRECT';
  const myId = auth.me?.id;

  const [message, setMessage] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_STEP);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);
  const typingStopTimeoutRef = useRef<number | undefined>(undefined);
  const typingUserTimeoutsRef = useRef<Map<string, number>>(new Map());

  // Reset per-conversation state when switching chats.
  useEffect(() => {
    setMessage('');
    setAttachmentFile(null);
    setReplyingTo(null);
    setMenuFor(null);
    setSearch('');
    setShowSearch(false);
    setLimit(PAGE_STEP);
    setTypingUsers(new Map());
    stickToBottomRef.current = true;
  }, [chatId]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const messagesKey = useMemo(
    () => ['chat-messages', chatId, debouncedSearch, limit] as const,
    [chatId, debouncedSearch, limit]
  );

  const messagesQuery = useQuery({
    queryKey: messagesKey,
    queryFn: () =>
      listChatMessagesApi(auth.accessToken!, chatId, {
        pageSize: limit,
        q: debouncedSearch || undefined,
      }),
    enabled: Boolean(auth.accessToken),
    placeholderData: (prev) => prev,
  });

  const readReceiptsQuery = useQuery({
    queryKey: ['chat-read-receipts', chatId],
    queryFn: () => getReadReceiptsApi(auth.accessToken!, chatId),
    enabled: Boolean(auth.accessToken),
    refetchInterval: 30000,
  });

  // Live updates for this conversation.
  useEffect(() => {
    if (!myId) return;
    socket.emit('chat:join', { chatId, userId: myId });

    function upsertMessage(msg: ChatMessage, append: boolean) {
      queryClient.setQueryData<ChatMessagesResponse | undefined>(messagesKey, (old) => {
        if (!old) return old;
        if (old.items.some((m) => m.id === msg.id)) {
          return { ...old, items: old.items.map((m) => (m.id === msg.id ? msg : m)) };
        }
        if (!append) return old;
        return {
          ...old,
          items: [...old.items, msg],
          pagination: { ...old.pagination, totalItems: old.pagination.totalItems + 1 },
        };
      });
    }
    const onNew = (msg: ChatMessage) => upsertMessage(msg, true);
    const onUpdated = (msg: ChatMessage) => upsertMessage(msg, false);
    const onPresence = ({ chatId: cid, onlineUserIds: ids }: { chatId: string; onlineUserIds: string[] }) => {
      if (cid === chatId) setOnlineUserIds(ids);
    };
    const onRead = ({ chatId: cid }: { chatId: string }) => {
      if (cid === chatId) void queryClient.invalidateQueries({ queryKey: ['chat-read-receipts', chatId] });
    };
    const onTyping = ({ chatId: cid, userId: uid, userName }: { chatId: string; userId: string; userName?: string }) => {
      if (cid !== chatId || uid === myId) return;
      setTypingUsers((prev) => new Map(prev).set(uid, userName ?? 'Someone'));
      const timeouts = typingUserTimeoutsRef.current;
      const existing = timeouts.get(uid);
      if (existing) window.clearTimeout(existing);
      timeouts.set(
        uid,
        window.setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(uid);
            return next;
          });
        }, 4000)
      );
    };
    const onStopTyping = ({ chatId: cid, userId: uid }: { chatId: string; userId: string }) => {
      if (cid !== chatId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(uid);
        return next;
      });
    };

    socket.on('chat:newMessage', onNew);
    socket.on('chat:messageUpdated', onUpdated);
    socket.on('chat:presence', onPresence);
    socket.on('chat:read', onRead);
    socket.on('chat:typing', onTyping);
    socket.on('chat:stopTyping', onStopTyping);
    const typingTimeouts = typingUserTimeoutsRef.current;
    return () => {
      socket.emit('chat:leave', { chatId, userId: myId });
      socket.off('chat:newMessage', onNew);
      socket.off('chat:messageUpdated', onUpdated);
      socket.off('chat:presence', onPresence);
      socket.off('chat:read', onRead);
      socket.off('chat:typing', onTyping);
      socket.off('chat:stopTyping', onStopTyping);
      for (const timeout of typingTimeouts.values()) window.clearTimeout(timeout);
      typingTimeouts.clear();
    };
  }, [chatId, myId, messagesKey, queryClient]);

  const items = useMemo(() => messagesQuery.data?.items ?? [], [messagesQuery.data]);
  const totalItems = messagesQuery.data?.pagination.totalItems ?? 0;
  const canLoadEarlier = items.length < totalItems && limit < MAX_LOADED;

  // Keep the view pinned to the newest message unless the reader scrolled up.
  useEffect(() => {
    if (stickToBottomRef.current) endRef.current?.scrollIntoView({ block: 'end' });
  }, [items.length, typingUsers.size]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    stickToBottomRef.current = nearBottom;
    setShowJump(!nearBottom);
  }

  useEffect(() => {
    if (auth.accessToken && items.length) {
      void markChatReadApi(auth.accessToken, chatId).then(() =>
        queryClient.invalidateQueries({ queryKey: ['my-chats'] })
      );
    }
  }, [chatId, auth.accessToken, items.length, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      let attachment;
      if (attachmentFile) {
        setIsUploading(true);
        try {
          attachment = await uploadFileToCloudinary(auth.accessToken!, 'chat', attachmentFile);
        } finally {
          setIsUploading(false);
        }
      }
      const mentionedUserIds = roster
        .filter((r) => message.toLowerCase().includes(`@${r.firstName.toLowerCase()}`))
        .map((r) => r.id);
      return sendChatMessageApi(auth.accessToken!, chatId, {
        content: message.trim(),
        attachment,
        replyToId: replyingTo?.id,
        mentionedUserIds,
      });
    },
    onSuccess: (msg) => {
      queryClient.setQueryData<ChatMessagesResponse | undefined>(messagesKey, (old) =>
        old && !old.items.some((m) => m.id === msg.id)
          ? { ...old, items: [...old.items, msg], pagination: { ...old.pagination, totalItems: old.pagination.totalItems + 1 } }
          : old
      );
      stickToBottomRef.current = true;
      setMessage('');
      setAttachmentFile(null);
      setReplyingTo(null);
      if (myId) socket.emit('chat:stopTyping', { chatId, userId: myId });
      void queryClient.invalidateQueries({ queryKey: ['my-chats'] });
      inputRef.current?.focus();
    },
    onError: (e) =>
      showToast({ type: 'error', title: 'Could not send', message: (e as ApiClientError).message }),
  });

  const reactMutation = useMutation({
    mutationFn: ({ messageId, emoji, alreadyReacted }: { messageId: string; emoji: string; alreadyReacted: boolean }) =>
      alreadyReacted
        ? removeReactionApi(auth.accessToken!, chatId, messageId, emoji)
        : reactToMessageApi(auth.accessToken!, chatId, messageId, emoji),
    onError: (e) =>
      showToast({ type: 'error', title: 'Could not react', message: (e as ApiClientError).message }),
  });

  const pinMutation = useMutation({
    mutationFn: ({ messageId, pinned }: { messageId: string; pinned: boolean }) =>
      pinned ? unpinMessageApi(auth.accessToken!, chatId, messageId) : pinMessageApi(auth.accessToken!, chatId, messageId),
    onError: (e) =>
      showToast({ type: 'error', title: 'Could not update pin', message: (e as ApiClientError).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => deleteMessageApi(auth.accessToken!, chatId, messageId),
    onError: (e) =>
      showToast({ type: 'error', title: 'Could not delete', message: (e as ApiClientError).message }),
  });

  function handleMessageInput(value: string) {
    setMessage(value);
    const atIndex = value.lastIndexOf('@');
    if (!isOneToOne && atIndex >= 0 && (atIndex === 0 || /\s/.test(value[atIndex - 1]))) {
      setMentionQuery(value.slice(atIndex + 1));
    } else {
      setMentionQuery(null);
    }
    if (!myId) return;
    socket.emit('chat:typing', { chatId, userId: myId, userName: auth.me?.firstName });
    if (typingStopTimeoutRef.current) window.clearTimeout(typingStopTimeoutRef.current);
    typingStopTimeoutRef.current = window.setTimeout(() => {
      socket.emit('chat:stopTyping', { chatId, userId: myId });
    }, 2000);
  }

  function insertMention(member: { firstName: string }) {
    const atIndex = message.lastIndexOf('@');
    const before = atIndex >= 0 ? message.slice(0, atIndex) : message;
    setMessage(`${before}@${member.firstName} `);
    setMentionQuery(null);
    inputRef.current?.focus();
  }

  function submit() {
    if ((message.trim() || attachmentFile) && !sendMutation.isPending) sendMutation.mutate();
  }

  // Auto-grow the composer up to ~5 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [message]);

  const mentionMatches =
    mentionQuery !== null
      ? roster
          .filter((r) => r.id !== myId && r.firstName.toLowerCase().startsWith(mentionQuery.toLowerCase()))
          .slice(0, 6)
      : [];

  const others = roster.filter((r) => r.id !== myId);
  const onlineOthers = others.filter((r) => onlineUserIds.includes(r.id));
  const typingNames = [...typingUsers.values()];
  const reads = readReceiptsQuery.data ?? [];

  /** WhatsApp ticks: grey ✓ sent; blue ✓✓ read by everyone else (or the other person). */
  function readState(msg: ChatMessage): 'sent' | 'read' {
    const readers = reads.filter(
      (r) => r.user.id !== msg.sender.id && new Date(r.lastReadAt) >= new Date(msg.createdAt)
    ).length;
    const needed = Math.max(others.length, 1);
    return readers >= needed ? 'read' : 'sent';
  }

  let subtitle: string;
  if (typingNames.length) {
    subtitle = isOneToOne ? 'typing…' : `${typingNames.slice(0, 2).join(', ')} typing…`;
  } else if (isOneToOne) {
    subtitle = onlineOthers.length ? 'online' : 'tap for contact info';
  } else {
    const count = roster.length;
    subtitle = `${count} ${count === 1 ? 'member' : 'members'}${onlineOthers.length ? ` · ${onlineOthers.length} online` : ''}`;
    if (chat.type === 'CLASS' && chat.academicYear) subtitle = `${chat.academicYear.name} · ${subtitle}`;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Back to chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onOpenInfo}
          disabled={!onOpenInfo}
          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
        >
          <ChatAvatar title={chat.title} type={chat.type ?? 'CLASS'} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-slate-900">{chat.title}</span>
            <span
              className={`block truncate text-xs ${typingNames.length || (isOneToOne && onlineOthers.length) ? 'text-emerald-600' : 'text-slate-500'}`}
            >
              {subtitle}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setShowSearch((v) => !v);
            if (showSearch) setSearch('');
          }}
          className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
          aria-label="Search messages"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>
        {onOpenInfo ? (
          <button
            type="button"
            onClick={onOpenInfo}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
            aria-label="Chat info"
          >
            <Info className="h-[18px] w-[18px]" />
          </button>
        ) : null}
      </div>

      {showSearch ? (
        <div className="border-b border-slate-200 bg-white px-4 py-2">
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in this chat"
            className="w-full rounded-lg bg-slate-100 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
      ) : null}
      {banner}

      {/* Messages */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto bg-[#efeae2] px-3 py-3 sm:px-[6%]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(15,39,72,0.05) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        >
          {canLoadEarlier ? (
            <div className="mb-3 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  stickToBottomRef.current = false;
                  setLimit((l) => Math.min(l + PAGE_STEP, MAX_LOADED));
                }}
                className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-white"
              >
                {messagesQuery.isFetching ? 'Loading…' : 'Load earlier messages'}
              </button>
            </div>
          ) : null}

          {messagesQuery.isPending ? (
            <ListSkeleton rows={6} showAvatar={false} />
          ) : items.length === 0 ? (
            <div className="mx-auto mt-10 max-w-sm rounded-xl bg-white/90 p-4 shadow-sm">
              <EmptyState
                title={debouncedSearch ? 'No matching messages' : 'No messages yet'}
                message={debouncedSearch ? 'Try a different word.' : 'Say hello 👋'}
              />
            </div>
          ) : (
            items.map((msg, index) => {
              const prev = items[index - 1];
              const created = new Date(msg.createdAt);
              const newDay = !prev || new Date(prev.createdAt).toDateString() !== created.toDateString();
              const grouped =
                !newDay &&
                prev &&
                prev.sender.id === msg.sender.id &&
                created.getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
              const isMine = msg.sender.id === myId;
              const canDelete = !msg.isDeleted && (isMine || permissions.canModerate);
              const showName = !isMine && !isOneToOne && !grouped;

              return (
                <Fragment key={msg.id}>
                  {newDay ? (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-lg bg-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 shadow-sm">
                        {dayLabel(created)}
                      </span>
                    </div>
                  ) : null}
                  <div className={`group flex ${isMine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : 'mt-2'}`}>
                    <div
                      className={`relative max-w-[85%] rounded-lg px-2.5 pb-1.5 pt-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] sm:max-w-[65%] ${
                        isMine ? 'bg-[#d9fdd3] text-slate-900' : 'bg-white text-slate-900'
                      } ${!grouped ? (isMine ? 'rounded-tr-none' : 'rounded-tl-none') : ''}`}
                    >
                      {/* Actions menu trigger */}
                      {!msg.isDeleted ? (
                        <button
                          type="button"
                          onClick={() => setMenuFor(menuFor === msg.id ? null : msg.id)}
                          className={`absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full text-slate-500 opacity-0 transition hover:bg-black/5 focus:opacity-100 group-hover:opacity-100 ${
                            menuFor === msg.id ? 'opacity-100' : ''
                          } ${isMine ? 'bg-[#d9fdd3]' : 'bg-white'}`}
                          aria-label="Message options"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      ) : null}

                      {showName ? (
                        <p className={`pr-6 text-[13px] font-semibold ${nameColor(msg.sender.id)}`}>
                          {msg.sender.firstName} {msg.sender.lastName}
                          {msg.isAnnouncement ? <span className="ml-1 text-slate-500">· Announcement</span> : null}
                        </p>
                      ) : null}

                      {msg.isPinned ? (
                        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500">
                          <Pin className="h-3 w-3" /> Pinned
                        </p>
                      ) : null}

                      {msg.replyTo ? (
                        <div
                          className={`mb-1 mt-0.5 rounded-md border-l-4 border-emerald-500 px-2 py-1 text-xs ${
                            isMine ? 'bg-[#cfe9c7]' : 'bg-slate-100'
                          }`}
                        >
                          <p className={`font-semibold ${nameColor(msg.replyTo.sender.id)}`}>
                            {msg.replyTo.sender.id === myId ? 'You' : msg.replyTo.sender.firstName}
                          </p>
                          <p className="line-clamp-2 text-slate-600">{msg.replyTo.content ?? 'Message deleted'}</p>
                        </div>
                      ) : null}

                      {msg.isDeleted ? (
                        <p className="pr-14 text-sm italic text-slate-500">🚫 This message was deleted</p>
                      ) : (
                        <>
                          {msg.attachment ? (
                            <div className="mb-1 mt-0.5">
                              {msg.attachment.mimeType === 'application/pdf' ? (
                                <SecurePdfViewer
                                  assetId={msg.attachment.id}
                                  accessToken={auth.accessToken!}
                                  className="max-w-xs"
                                />
                              ) : msg.attachment.resourceType === 'IMAGE' && msg.attachment.secureUrl ? (
                                <a href={msg.attachment.secureUrl} target="_blank" rel="noreferrer">
                                  <img
                                    src={msg.attachment.secureUrl}
                                    alt={msg.attachment.originalName}
                                    className="max-h-64 max-w-full rounded-md object-cover"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={msg.attachment.secureUrl ?? undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 rounded-md bg-black/5 px-2.5 py-2 text-xs font-medium"
                                >
                                  <FileText className="h-5 w-5 text-slate-500" />
                                  <span className="truncate">{msg.attachment.originalName}</span>
                                </a>
                              )}
                            </div>
                          ) : null}
                          {msg.content ? (
                            <p className="whitespace-pre-wrap break-words pr-14 text-[14.5px] leading-snug">
                              {renderContentWithMentions(msg.content, msg.mentionedUserIds, roster)}
                            </p>
                          ) : null}
                        </>
                      )}

                      {/* Time + ticks, tucked into the bottom-right like WhatsApp */}
                      <span className="float-right -mb-0.5 ml-2 mt-0.5 flex items-center gap-1 text-[11px] leading-none text-slate-500">
                        {timeLabel(msg.createdAt)}
                        {isMine && !msg.isDeleted ? (
                          readState(msg) === 'read' ? (
                            <CheckCheck className="h-4 w-4 text-sky-500" aria-label="Read" />
                          ) : (
                            <Check className="h-4 w-4" aria-label="Sent" />
                          )
                        ) : null}
                      </span>
                      <span className="clear-both block" />

                      {msg.reactions.length > 0 ? (
                        <div className={`-mb-3 mt-1 flex flex-wrap gap-1 ${isMine ? 'justify-end' : ''}`}>
                          {msg.reactions.map((r) => (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={() =>
                                reactMutation.mutate({ messageId: msg.id, emoji: r.emoji, alreadyReacted: r.reactedByMe })
                              }
                              className={`rounded-full border bg-white px-1.5 py-0.5 text-xs shadow-sm ${
                                r.reactedByMe ? 'border-emerald-300' : 'border-slate-200'
                              }`}
                            >
                              {r.emoji} {r.count > 1 ? r.count : ''}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {menuFor === msg.id ? (
                        <div
                          className={`absolute top-7 z-20 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg ${
                            isMine ? 'right-1' : 'left-1'
                          }`}
                        >
                          <div className="flex justify-between px-2 pb-1">
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  const already = msg.reactions.find((r) => r.emoji === emoji)?.reactedByMe ?? false;
                                  reactMutation.mutate({ messageId: msg.id, emoji, alreadyReacted: already });
                                  setMenuFor(null);
                                }}
                                className="rounded p-0.5 text-lg hover:bg-slate-100"
                                aria-label={`React ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(msg);
                              setMenuFor(null);
                              inputRef.current?.focus();
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <Reply className="h-4 w-4 text-slate-500" /> Reply
                          </button>
                          {permissions.canPin ? (
                            <button
                              type="button"
                              onClick={() => {
                                pinMutation.mutate({ messageId: msg.id, pinned: msg.isPinned });
                                setMenuFor(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                            >
                              {msg.isPinned ? <PinOff className="h-4 w-4 text-slate-500" /> : <Pin className="h-4 w-4 text-slate-500" />}
                              {msg.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => {
                                deleteMutation.mutate(msg.id);
                                setMenuFor(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Fragment>
              );
            })
          )}
          {typingNames.length > 0 ? (
            <div className="mt-2 flex">
              <span className="rounded-lg rounded-tl-none bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
                {isOneToOne ? '' : `${typingNames[0]} `}
                <span className="inline-flex gap-0.5 align-middle">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                </span>
              </span>
            </div>
          ) : null}
          <div ref={endRef} className="h-2" />
        </div>
        {showJump ? (
          <button
            type="button"
            onClick={() => {
              stickToBottomRef.current = true;
              endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }}
            className="absolute bottom-3 right-4 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow-md hover:bg-slate-50"
            aria-label="Jump to latest message"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {/* Composer */}
      {permissions.canSend ? (
        <div className="bg-[#f0f2f5] px-2 py-2 sm:px-3">
          {replyingTo ? (
            <div className="mb-2 flex items-start gap-2 rounded-lg border-l-4 border-emerald-500 bg-white px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${nameColor(replyingTo.sender.id)}`}>
                  {replyingTo.sender.id === myId ? 'You' : `${replyingTo.sender.firstName} ${replyingTo.sender.lastName}`}
                </p>
                <p className="truncate text-slate-600">{replyingTo.content ?? 'Attachment'}</p>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          ) : null}
          {attachmentFile ? (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
              <Paperclip className="h-4 w-4 text-slate-500" />
              <span className="min-w-0 flex-1 truncate">{attachmentFile.name}</span>
              <button type="button" onClick={() => setAttachmentFile(null)} aria-label="Remove attachment">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          ) : null}
          <div className="relative flex items-end gap-2">
            {mentionMatches.length > 0 ? (
              <div className="absolute bottom-full left-10 mb-2 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {mentionMatches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => insertMention(m)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                      {initials(m.firstName, m.lastName)}
                    </span>
                    {m.firstName} {m.lastName}
                  </button>
                ))}
              </div>
            ) : null}
            <label
              className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-slate-500 hover:bg-slate-200"
              aria-label="Attach a file"
            >
              <Paperclip className="h-5 w-5" />
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  setAttachmentFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </label>
            <div className="flex min-h-10 flex-1 items-center rounded-3xl bg-white px-4 py-2">
              <SmilePlus className="mr-2 hidden h-5 w-5 shrink-0 text-slate-400 sm:block" aria-hidden />
              <textarea
                ref={inputRef}
                rows={1}
                value={message}
                onChange={(e) => handleMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={isOneToOne ? 'Type a message' : 'Type a message — @ to mention'}
                className="max-h-32 w-full resize-none bg-transparent text-[15px] leading-6 outline-none placeholder:text-slate-400"
                maxLength={5000}
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={(!message.trim() && !attachmentFile) || sendMutation.isPending}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
              aria-label="Send message"
            >
              {sendMutation.isPending || isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SendHorizontal className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#f0f2f5] px-5 py-3 text-center text-xs text-slate-500">
          You can read this conversation but cannot send messages.
        </div>
      )}
    </div>
  );
}
