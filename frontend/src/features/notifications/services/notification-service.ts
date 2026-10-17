import type { HttpClient } from "@/lib/api/http-client"
import type { AppNotification, NotificationPreferences } from "../types"

export interface NotificationService {
  list(): Promise<AppNotification[]>
  markRead(id: string): Promise<void>
  markAllRead(): Promise<void>
  getPreferences(): Promise<NotificationPreferences>
  updatePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences>
}

export function createHttpNotificationService(http: HttpClient): NotificationService {
  return {
    list: () => http.get("/api/notifications"),
    markRead: (id) => http.post(`/api/notifications/${encodeURIComponent(id)}/read`),
    markAllRead: () => http.post("/api/notifications/read-all"),
    getPreferences: () => http.get("/api/notifications/preferences"),
    updatePreferences: (preferences) =>
      http.request("PUT", "/api/notifications/preferences", { body: preferences }),
  }
}
