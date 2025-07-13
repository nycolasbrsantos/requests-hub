import { db } from '@/db';
import { notifications, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendEmail } from './send-email';

export async function createNotification({
  userId,
  title,
  body,
  link,
  type = 'in-app',
  sendEmailNotification = false,
}: {
  userId: number;
  title: string;
  body: string;
  link?: string;
  type?: 'in-app' | 'email';
  sendEmailNotification?: boolean;
}) {
  // Cria notificação in-app
  await db.insert(notifications).values({
    userId,
    title,
    body,
    link,
    type,
    read: 0,
  });

  // Opcional: envia e-mail
  if (sendEmailNotification) {
    const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: title,
        text: body,
        html: `<p>${body}</p>${link ? `<p><a href='${link}'>View details</a></p>` : ''}`,
      });
    }
  }
}

export async function getUserNotifications(userId: number, onlyUnread = false) {
  return db.select().from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      onlyUnread ? eq(notifications.read, 0) : undefined
    ))
    .orderBy(notifications.createdAt);
}

export async function markNotificationAsRead(notificationId: number) {
  await db.update(notifications)
    .set({ read: 1 })
    .where(eq(notifications.id, notificationId));
}

export async function markAllNotificationsAsRead(userId: number) {
  await db.update(notifications)
    .set({ read: 1 })
    .where(eq(notifications.userId, userId));
} 