"use client";
import { useEffect, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { Skeleton } from "./skeleton";
import { useSession } from "next-auth/react";

interface Notification {
  id: number;
  title: string;
  body: string;
  link?: string;
  read: number;
  createdAt: string;
}

export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    fetch("/api/notifications?unread=true")
      .then((res) => res.json())
      .then((data) => setNotifications(data.notifications || []))
      .finally(() => setLoading(false));
  }, [session?.user?.id, open]);

  const unreadCount = notifications.filter((n) => n.read === 0).length;

  const handleMarkAsRead = async (id: number) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: 1 } : n));
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => setOpen((v) => !v)}>
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
            {unreadCount}
          </Badge>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow-lg z-50 p-4">
          <div className="font-semibold mb-2 flex items-center gap-2">
            <Bell className="w-5 h-5" /> Notifications
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-muted-foreground text-sm">No new notifications.</div>
          ) : (
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-2 border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{n.title}</div>
                    <div className="text-xs text-muted-foreground mb-1">{n.body}</div>
                    <div className="text-xs text-muted-foreground mb-1">{new Date(n.createdAt).toLocaleString()}</div>
                    {n.link && (
                      <a href={n.link} className="text-blue-600 underline text-xs" target="_blank" rel="noopener noreferrer">View details</a>
                    )}
                  </div>
                  {n.read === 0 && (
                    <Button size="icon" variant="ghost" onClick={() => handleMarkAsRead(n.id)} title="Mark as read">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
} 