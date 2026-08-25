import {
  FileText,
  Loader2,
  Paperclip,
  Pin,
  PinOff,
  Reply,
  Search,
  Send,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { StateView } from '../components/state-view';
import { ListSkeleton, PageSkeleton } from '../components/skeleton-loader';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import { useAcademicYear } from '../contexts/academic-year-context';
import { SecurePdfViewer } from '../components/secure-pdf-viewer';
import { uploadFileToCloudinary } from '../features/sprint4/cloudinary-upload';
import { listMyCoursesApi } from '../features/sprint4/lms.api';
import socket from '../utils/socket';
import {
  deleteMessageApi,
  getOrCreateChatApi,
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
} from '../features/chat/chat.api';
import { ApiClientError } from '../types/api';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

function renderContentWithMentions(
  content: string,
  mentionedUserIds: string[],
  roster: ChatMessage['sender'][]
) {
  if (!mentionedUserIds.length) return content;
  const names = mentionedUserIds
    .map((id) =>
      (roster as Array<{ id: string; firstName: string; lastName: string }>).find(
        (r) => r.id === id
      )
    )
    .filter((r): r is { id: string; firstName: string; lastName: string } => Boolean(r));
  if (!names.length) return content;

  const pattern = new RegExp(`(${names.map((n) => `@${n.firstName}`).join('|')})`, 'gi');
  const parts = content.split(pattern);
  return parts.map((part, i) =>
    names.some((n) => part.toLowerCase() === `@${n.firstName}`.toLowerCase()) ? (
      <span key={i} className="rounded bg-brand-100 px-1 font-semibold text-brand-700">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function ClassChatPage() {
  const params = useParams<{ classRoomId?: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { academicYearId: globalAcademicYearId } = useAcademicYear();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [message, setMessage] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingStopTimeoutRef = useRef<number | undefined>(undefined);
  const typingUserTimeoutsRef = useRef<Map<string, number>>(new Map());

  const isStudent = auth.me ? auth.me.roles?.includes('STUDENT') : false;

  // Students reach this page via a bare /student/chat link with no classRoomId in the URL —
  // resolve it from their own enrollment instead of requiring the link to know it in advance.
  const myCourseQuery = useQuery({
    queryKey: ['student-chat-classroom'],
    queryFn: () => listMyCoursesApi(auth.accessToken!, { pageSize: 1 }),
    enabled: Boolean(auth.accessToken && isStudent && !params.classRoomId),
  });

  useEffect(() => {
    const resolvedClassRoomId = myCourseQuery.data?.items[0]?.classRoom.id;
    if (!params.classRoomId && resolvedClassRoomId) {
      navigate(`/student/chat/${resolvedClassRoomId}`, { replace: true });
    }
  }, [myCourseQuery.data, params.classRoomId, navigate]);

  const classRoomId = params.classRoomId;

  const chatQuery = useQuery({
    queryKey: ['class-chat', classRoomId, globalAcademicYearId],
    queryFn: () =>
      getOrCreateChatApi(auth.accessToken!, classRoomId!, globalAcademicYearId ?? undefined),
    enabled: Boolean(auth.accessToken && classRoomId),
  });

  const chatId = chatQuery.data?.id;
  const permissions = chatQuery.data?.permissions;
  const roster = useMemo(() => chatQuery.data?.roster ?? [], [chatQuery.data]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', chatId, debouncedSearch],
    queryFn: () =>
      listChatMessagesApi(auth.accessToken!, chatId!, {
        pageSize: 100,
        q: debouncedSearch || undefined,
      }),
    enabled: Boolean(auth.accessToken && chatId),
  });

  const readReceiptsQuery = useQuery({
    queryKey: ['chat-read-receipts', chatId],
    queryFn: () => getReadReceiptsApi(auth.accessToken!, chatId!),
    enabled: Boolean(auth.accessToken && chatId),
    refetchInterval: 20000,
  });

  // Real-time delivery: join this chat's socket room, listen for new/updated messages so
  // everyone sees them instantly instead of polling, and track typing/online presence.
  useEffect(() => {
    if (!chatId || !auth.me) return;
    const userId = auth.me.id;
    socket.emit('chat:join', { chatId, userId });

    function upsertMessage(msg: ChatMessage, append: boolean) {
      queryClient.setQueryData<ChatMessagesResponse | undefined>(
        ['chat-messages', chatId, debouncedSearch],
        (old) => {
          if (!old) return old;
          const exists = old.items.some((m) => m.id === msg.id);
          if (exists) {
            return { ...old, items: old.items.map((m) => (m.id === msg.id ? msg : m)) };
          }
          if (!append) return old;
          return {
            ...old,
            items: [...old.items, msg],
            pagination: { ...old.pagination, totalItems: old.pagination.totalItems + 1 },
          };
        }
      );
    }

    function handleNewMessage(msg: ChatMessage) {
      upsertMessage(msg, true);
    }
    function handleMessageUpdated(msg: ChatMessage) {
      upsertMessage(msg, false);
    }
    function handlePresence({
      chatId: cid,
      onlineUserIds: ids,
    }: {
      chatId: string;
      onlineUserIds: string[];
    }) {
      if (cid === chatId) setOnlineUserIds(ids);
    }
    function handleTyping({
      chatId: cid,
      userId: uid,
      userName,
    }: {
      chatId: string;
      userId: string;
      userName?: string;
    }) {
      if (cid !== chatId || uid === userId) return;
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
    }
    function handleStopTyping({ chatId: cid, userId: uid }: { chatId: string; userId: string }) {
      if (cid !== chatId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(uid);
        return next;
      });
    }

    socket.on('chat:newMessage', handleNewMessage);
    socket.on('chat:messageUpdated', handleMessageUpdated);
    socket.on('chat:presence', handlePresence);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:stopTyping', handleStopTyping);

    return () => {
      socket.emit('chat:leave', { chatId, userId });
      socket.off('chat:newMessage', handleNewMessage);
      socket.off('chat:messageUpdated', handleMessageUpdated);
      socket.off('chat:presence', handlePresence);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:stopTyping', handleStopTyping);
      for (const timeout of typingUserTimeoutsRef.current.values()) window.clearTimeout(timeout);
      typingUserTimeoutsRef.current.clear();
    };
  }, [chatId, auth.me?.id, debouncedSearch, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data?.items.length]);

  useEffect(() => {
    if (chatId && auth.accessToken) {
      void markChatReadApi(auth.accessToken, chatId);
    }
  }, [chatId, auth.accessToken, messagesQuery.data?.items.length]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      let attachment;
      if (attachmentFile) {
        setIsUploading(true);
        attachment = await uploadFileToCloudinary(auth.accessToken!, 'chat', attachmentFile);
        setIsUploading(false);
      }
      const mentionedUserIds = roster
        .filter((r) => message.toLowerCase().includes(`@${r.firstName.toLowerCase()}`))
        .map((r) => r.id);
      return sendChatMessageApi(auth.accessToken!, chatId!, {
        content: message.trim(),
        attachment,
        replyToId: replyingTo?.id,
        mentionedUserIds,
      });
    },
    onSuccess: () => {
      setMessage('');
      setAttachmentFile(null);
      setReplyingTo(null);
    },
    onError: (e) => {
      setIsUploading(false);
      showToast({ type: 'error', title: 'Could not send', message: (e as ApiClientError).message });
    },
  });

  const reactMutation = useMutation({
    mutationFn: ({
      messageId,
      emoji,
      alreadyReacted,
    }: {
      messageId: string;
      emoji: string;
      alreadyReacted: boolean;
    }) =>
      alreadyReacted
        ? removeReactionApi(auth.accessToken!, chatId!, messageId, emoji)
        : reactToMessageApi(auth.accessToken!, chatId!, messageId, emoji),
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'Could not react',
        message: (e as ApiClientError).message,
      }),
  });

  const pinMutation = useMutation({
    mutationFn: ({ messageId, pinned }: { messageId: string; pinned: boolean }) =>
      pinned
        ? unpinMessageApi(auth.accessToken!, chatId!, messageId)
        : pinMessageApi(auth.accessToken!, chatId!, messageId),
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'Could not update pin',
        message: (e as ApiClientError).message,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => deleteMessageApi(auth.accessToken!, chatId!, messageId),
    onError: (e) =>
      showToast({
        type: 'error',
        title: 'Could not delete',
        message: (e as ApiClientError).message,
      }),
  });

  function handleMessageInput(value: string) {
    setMessage(value);
    const atIndex = value.lastIndexOf('@');
    if (atIndex >= 0 && (atIndex === 0 || value[atIndex - 1] === ' ')) {
      setMentionQuery(value.slice(atIndex + 1));
    } else {
      setMentionQuery(null);
    }

    if (!chatId || !auth.me) return;
    socket.emit('chat:typing', { chatId, userId: auth.me.id, userName: auth.me.firstName });
    if (typingStopTimeoutRef.current) window.clearTimeout(typingStopTimeoutRef.current);
    typingStopTimeoutRef.current = window.setTimeout(() => {
      socket.emit('chat:stopTyping', { chatId, userId: auth.me!.id });
    }, 2000);
  }

  function insertMention(member: { id: string; firstName: string }) {
    const atIndex = message.lastIndexOf('@');
    const before = atIndex >= 0 ? message.slice(0, atIndex) : message;
    setMessage(`${before}@${member.firstName} `);
    setMentionQuery(null);
  }

  if (!classRoomId) {
    if (isStudent) {
      return <PageSkeleton variant="detail" />;
    }
    return <StateView title="No class selected" message="Select a class to open its chat." />;
  }

  if (chatQuery.isError) {
    return (
      <StateView
        title="Could not open chat"
        message={
          (chatQuery.error as ApiClientError)?.message ??
          'You may not have access to this class chat.'
        }
      />
    );
  }

  const mentionMatches =
    mentionQuery !== null
      ? roster
          .filter((r) => r.firstName.toLowerCase().startsWith(mentionQuery.toLowerCase()))
          .slice(0, 5)
      : [];

  const onlineNames = roster.filter((r) => onlineUserIds.includes(r.id));
  const typingNames = [...typingUsers.values()];

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {chatQuery.data?.classRoom.name ?? 'Class Chat'}
          </h2>
          <p className="text-xs text-slate-500">
            {chatQuery.data?.academicYear.name}
            {onlineNames.length ? ` · ${onlineNames.length} online` : ''}
          </p>
        </div>
        <div className="relative w-48">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages"
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-xs outline-none focus:border-brand-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messagesQuery.isPending ? (
          <ListSkeleton rows={6} showAvatar={false} />
        ) : messagesQuery.data?.items.length === 0 ? (
          <EmptyState
            title={debouncedSearch ? 'No matching messages' : 'No messages yet'}
            message={debouncedSearch ? 'Try a different search term.' : 'Start the conversation!'}
          />
        ) : (
          messagesQuery.data?.items.map((msg) => {
            const isMine = msg.sender.id === auth.me?.id;
            const readByOthers = (readReceiptsQuery.data ?? []).filter(
              (r) =>
                r.user.id !== msg.sender.id && new Date(r.lastReadAt) >= new Date(msg.createdAt)
            );
            return (
              <div
                key={msg.id}
                className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-2 ${isMine ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-900'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold opacity-70">
                      {msg.sender.firstName} {msg.sender.lastName}
                      {msg.isAnnouncement ? ' · Announcement' : ''}
                    </p>
                    {!msg.isDeleted && (
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          title="React"
                          onClick={() =>
                            setReactionPickerFor(reactionPickerFor === msg.id ? null : msg.id)
                          }
                          className={
                            isMine
                              ? 'text-white/80 hover:text-white'
                              : 'text-slate-500 hover:text-slate-800'
                          }
                        >
                          <SmilePlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Reply"
                          onClick={() => setReplyingTo(msg)}
                          className={
                            isMine
                              ? 'text-white/80 hover:text-white'
                              : 'text-slate-500 hover:text-slate-800'
                          }
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </button>
                        {permissions?.canPin && (
                          <button
                            type="button"
                            title={msg.isPinned ? 'Unpin' : 'Pin'}
                            onClick={() =>
                              pinMutation.mutate({ messageId: msg.id, pinned: msg.isPinned })
                            }
                            className={
                              isMine
                                ? 'text-white/80 hover:text-white'
                                : 'text-slate-500 hover:text-slate-800'
                            }
                          >
                            {msg.isPinned ? (
                              <PinOff className="h-3.5 w-3.5" />
                            ) : (
                              <Pin className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                        {permissions?.canModerate && (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => deleteMutation.mutate(msg.id)}
                            className={
                              isMine
                                ? 'text-white/80 hover:text-white'
                                : 'text-slate-500 hover:text-red-600'
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {msg.isPinned && (
                    <p className="mt-0.5 text-[10px] font-semibold uppercase opacity-70">
                      📌 Pinned
                    </p>
                  )}

                  {msg.replyTo && (
                    <div
                      className={`mt-1 rounded-lg border-l-2 px-2 py-1 text-xs opacity-80 ${isMine ? 'border-white/40' : 'border-slate-300'}`}
                    >
                      <span className="font-semibold">{msg.replyTo.sender.firstName}: </span>
                      {msg.replyTo.content ?? '[message deleted]'}
                    </div>
                  )}

                  {msg.isDeleted ? (
                    <p className="mt-1 text-sm italic opacity-60">Message deleted</p>
                  ) : (
                    <>
                      {msg.content && (
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {renderContentWithMentions(
                            msg.content,
                            msg.mentionedUserIds,
                            roster as never
                          )}
                        </p>
                      )}
                      {msg.attachment && (
                        <div className="mt-2">
                          {msg.attachment.mimeType === 'application/pdf' ? (
                            <SecurePdfViewer
                              assetId={msg.attachment.id}
                              accessToken={auth.accessToken!}
                              className="max-w-xs"
                            />
                          ) : msg.attachment.resourceType === 'IMAGE' &&
                            msg.attachment.secureUrl ? (
                            <img
                              src={msg.attachment.secureUrl}
                              alt={msg.attachment.originalName}
                              className="max-h-56 max-w-xs rounded-lg object-cover"
                            />
                          ) : (
                            <a
                              href={msg.attachment.secureUrl ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${isMine ? 'border-white/40' : 'border-slate-300'}`}
                            >
                              <FileText className="h-4 w-4" />
                              {msg.attachment.originalName}
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {msg.reactions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {msg.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() =>
                            reactMutation.mutate({
                              messageId: msg.id,
                              emoji: r.emoji,
                              alreadyReacted: r.reactedByMe,
                            })
                          }
                          className={`rounded-full border px-1.5 py-0.5 text-[11px] ${
                            r.reactedByMe
                              ? 'border-brand-400 bg-brand-50 text-brand-700'
                              : 'border-slate-200 bg-white/70 text-slate-600'
                          }`}
                        >
                          {r.emoji} {r.count}
                        </button>
                      ))}
                    </div>
                  )}

                  {reactionPickerFor === msg.id && (
                    <div className="mt-1.5 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            const already =
                              msg.reactions.find((r) => r.emoji === emoji)?.reactedByMe ?? false;
                            reactMutation.mutate({
                              messageId: msg.id,
                              emoji,
                              alreadyReacted: already,
                            });
                            setReactionPickerFor(null);
                          }}
                          className="rounded px-1 text-base hover:bg-slate-100"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-50">
                    <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    {isMine && readByOthers.length > 0 && (
                      <span>Seen by {readByOthers.length}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {typingNames.length > 0 && (
          <p className="text-xs italic text-slate-400">{typingNames.join(', ')} typing…</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {permissions?.canSend ? (
        <div className="border-t border-slate-200 px-5 py-3">
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              <span>
                Replying to <span className="font-semibold">{replyingTo.sender.firstName}</span>:{' '}
                {replyingTo.content?.slice(0, 60) ?? '[deleted]'}
              </span>
              <button type="button" onClick={() => setReplyingTo(null)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {attachmentFile && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              <span className="truncate">{attachmentFile.name}</span>
              <button type="button" onClick={() => setAttachmentFile(null)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="relative">
            {mentionMatches.length > 0 && (
              <div className="absolute bottom-full mb-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {mentionMatches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => insertMention(m)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
                      {initials(m.firstName, m.lastName)}
                    </span>
                    {m.firstName} {m.lastName}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if ((message.trim() || attachmentFile) && !sendMutation.isPending)
                  sendMutation.mutate();
              }}
              className="flex gap-2"
            >
              <label className="flex cursor-pointer items-center rounded-xl border border-slate-200 px-3 text-slate-500 hover:bg-slate-50">
                <Paperclip className="h-4 w-4" />
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => handleMessageInput(e.target.value)}
                placeholder="Type a message... use @ to mention"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-brand-400"
                maxLength={5000}
              />
              <button
                type="submit"
                disabled={(!message.trim() && !attachmentFile) || sendMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sendMutation.isPending || isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-200 px-5 py-3 text-center text-xs text-slate-400">
          You can view this conversation but cannot send messages.
        </div>
      )}
    </div>
  );
}
