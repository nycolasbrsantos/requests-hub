import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/authOptions';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const onlyUnread = req.nextUrl.searchParams.get('unread') === 'true';
  const notifications = await getUserNotifications(Number(session.user.id), onlyUnread);
  return NextResponse.json({ notifications });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { notificationId, all } = await req.json();
  if (all) {
    await markAllNotificationsAsRead(Number(session.user.id));
    return NextResponse.json({ success: true });
  }
  if (notificationId) {
    await markNotificationAsRead(Number(notificationId));
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
} 