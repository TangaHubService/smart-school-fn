import { Send, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { EmptyState } from '../components/empty-state';
import { StateView } from '../components/state-view';
import { useToast } from '../components/toast';
import { useAuth } from '../features/auth/auth.context';
import {
  getOrCreateChatApi,
  listChatMessagesApi,
  sendChatMessageApi,
} from '../features/chat/chat.api';
import { ApiClientError } from '../types/api';

export function StudentChatPage() {
  const { classRoomId } = useParams<{ classRoomId: string }>();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);

  const chatQuery = useQuery({
    queryKey: ['student-chat', classRoomId],
    queryFn: () => getOrCreateChatApi(auth.accessToken!, classRoomId!),
    enabled: Boolean(auth.accessToken && classRoomId),
  });

  const chatId = chatQuery.data?.id;

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', chatId, page],
    queryFn: () => listChatMessagesApi(auth.accessToken!, chatId!, { page, pageSize: 50 }),
    enabled: Boolean(auth.accessToken && chatId),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendChatMessageApi(auth.accessToken!, chatId!, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
      setMessage('');
    },
    onError: (e) => showToast({ type: 'error', title: 'Could not send', message: (e as ApiClientError).message }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data?.items]);

  if (!classRoomId) return <StateView title="No class selected" message="Select a class to open the chat." />;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-lg font-bold text-slate-900">
          {chatQuery.data?.classRoom.name ?? 'Class Chat'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messagesQuery.isPending ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
        ) : messagesQuery.data?.items.length === 0 ? (
          <EmptyState title="No messages yet" message="Start the conversation!" />
        ) : (
          messagesQuery.data?.items.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender.id === auth.me?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-xl px-4 py-2 ${
                msg.sender.id === auth.me?.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-900'
              }`}>
                <p className="text-xs font-semibold opacity-70">{msg.sender.firstName} {msg.sender.lastName}</p>
                <p className="mt-1 text-sm">{msg.content}</p>
                <p className="mt-1 text-[10px] opacity-50">{new Date(msg.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 px-5 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim() && !sendMutation.isPending) sendMutation.mutate(message.trim());
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-brand-400"
            maxLength={5000}
          />
          <button
            type="submit"
            disabled={!message.trim() || sendMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
