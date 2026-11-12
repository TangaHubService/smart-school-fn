import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { ChatThread } from '../components/chat/chat-thread';
import { PageSkeleton } from '../components/skeleton-loader';
import { StateView } from '../components/state-view';
import { useAcademicYear } from '../contexts/academic-year-context';
import { useAuth } from '../features/auth/auth.context';
import { getOrCreateChatApi } from '../features/chat/chat.api';
import { ApiClientError } from '../types/api';

/** Staff view of one class's chat (/admin/chat/:classRoomId). Students use the messenger. */
export function ClassChatPage() {
  const { classRoomId } = useParams<{ classRoomId?: string }>();
  const auth = useAuth();
  const { academicYearId } = useAcademicYear();

  const chatQuery = useQuery({
    queryKey: ['class-chat', classRoomId, academicYearId],
    queryFn: () => getOrCreateChatApi(auth.accessToken!, classRoomId!, academicYearId ?? undefined),
    enabled: Boolean(auth.accessToken && classRoomId),
  });

  if (!classRoomId) {
    return <StateView title="No class selected" message="Select a class to open its chat." />;
  }
  if (chatQuery.isError) {
    return (
      <StateView
        title="Could not open chat"
        message={(chatQuery.error as ApiClientError)?.message ?? 'You may not have access to this class chat.'}
      />
    );
  }
  if (!chatQuery.data) return <PageSkeleton variant="detail" />;

  const chat = {
    ...chatQuery.data,
    type: 'CLASS' as const,
    title: chatQuery.data.classRoom?.name ?? chatQuery.data.title,
  };

  return (
    <div className="h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <ChatThread chat={chat} />
    </div>
  );
}
