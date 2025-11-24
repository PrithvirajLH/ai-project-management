# Notifications System - Implementation Plan

## Overview
Implement a comprehensive notifications system with in-app notifications, email notifications, browser push notifications, and user preferences.

---

## Phase 1: Database Schema & Core Infrastructure (Week 1)

### 1.1 Create Notification Types
**File**: `types.ts`
```typescript
export type NotificationType = 
  | "card_assigned"
  | "card_mentioned"
  | "card_due_soon"
  | "card_overdue"
  | "list_created"
  | "card_created"
  | "card_moved"
  | "card_updated"
  | "workspace_invited"
  | "board_shared"
  | "comment_added"
  | "ai_action_completed"

export type NotificationChannel = "in_app" | "email" | "push"

export type Notification = {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  entityId?: string // cardId, listId, boardId, etc.
  entityType?: string // "card", "list", "board", etc.
  workspaceId: string
  boardId?: string
  read: boolean
  readAt?: Date
  channels: NotificationChannel[] // Which channels this notification was sent to
  createdAt: Date
  metadata?: Record<string, unknown> // Additional context
}
```

### 1.2 Create Azure Table Storage Schema
**File**: `lib/notifications.ts`
- Table: `Notifications`
- PartitionKey: `userId`
- RowKey: `notificationId` (UUID)
- Fields:
  - `type` (string)
  - `title` (string)
  - `message` (string)
  - `entityId` (string, optional)
  - `entityType` (string, optional)
  - `workspaceId` (string)
  - `boardId` (string, optional)
  - `read` (boolean)
  - `readAt` (DateTime, optional)
  - `channels` (JSON array)
  - `metadata` (JSON object, optional)
  - `createdAt` (DateTime)

### 1.3 Core Notification Functions
**File**: `lib/notifications.ts`
- `createNotification()` - Create a new notification
- `getUserNotifications()` - Get all notifications for a user (with pagination)
- `markNotificationAsRead()` - Mark notification as read
- `markAllNotificationsAsRead()` - Mark all as read
- `deleteNotification()` - Delete a notification
- `getUnreadCount()` - Get count of unread notifications
- `getNotificationPreferences()` - Get user's notification preferences
- `updateNotificationPreferences()` - Update user preferences

### 1.4 Notification Preferences Schema
**File**: `lib/notification-preferences.ts`
- Table: `NotificationPreferences`
- PartitionKey: `userId`
- RowKey: `preferenceId` (always "default" for now)
- Fields:
  - `emailEnabled` (boolean, default: true)
  - `pushEnabled` (boolean, default: true)
  - `inAppEnabled` (boolean, default: true)
  - `emailTypes` (JSON array of NotificationType)
  - `pushTypes` (JSON array of NotificationType)
  - `quietHoursStart` (string, optional, e.g., "22:00")
  - `quietHoursEnd` (string, optional, e.g., "08:00")
  - `timezone` (string, default: "UTC")

---

## Phase 2: In-App Notification Center (Week 1-2)

### 2.1 Notification Bell Component
**File**: `components/notifications/notification-bell.tsx`
- Bell icon in navbar (next to user button)
- Badge showing unread count
- Click opens notification center
- Real-time updates using polling or WebSocket (future)

### 2.2 Notification Center Component
**File**: `components/notifications/notification-center.tsx`
- Popover/Sheet with list of notifications
- Group by date (Today, Yesterday, This Week, Older)
- Mark as read on click
- Mark all as read button
- Filter by type
- Empty state
- Loading states

### 2.3 Notification Item Component
**File**: `components/notifications/notification-item.tsx`
- Display notification with icon based on type
- Show title, message, timestamp
- Visual indicator for unread
- Click to navigate to related entity (card, board, etc.)
- Action buttons (mark as read, dismiss)

### 2.4 API Routes
**File**: `app/api/notifications/route.ts`
- `GET /api/notifications` - Get user's notifications (with pagination)
- `POST /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### 2.5 React Query Hooks
**File**: `hooks/use-notifications.ts`
- `useNotifications()` - Fetch notifications
- `useUnreadCount()` - Get unread count
- `useMarkAsRead()` - Mutation to mark as read
- `useDeleteNotification()` - Mutation to delete

### 2.6 Integration Points
- Add notification bell to `components/navbar.tsx`
- Update audit log creation to trigger notifications
- Add notification triggers in:
  - Card creation/updates
  - List creation
  - Board sharing
  - Workspace invitations
  - AI agent actions

---

## Phase 3: Email Notifications (Week 2-3)

### 3.1 Email Notification Service
**File**: `lib/email-notifications.ts`
- `sendNotificationEmail()` - Send email via Microsoft Graph API
- Email templates for each notification type
- HTML email templates with branding
- Plain text fallback

### 3.2 Email Templates
**File**: `lib/email-templates/`
- `card-assigned.html`
- `card-due-soon.html`
- `card-overdue.html`
- `workspace-invited.html`
- `card-created.html`
- `card-updated.html`
- Generic template for other types

### 3.3 Email Queue System
**File**: `lib/email-queue.ts`
- Queue emails to be sent (store in Azure Table Storage)
- Background job/API route to process queue
- Retry logic for failed emails
- Rate limiting to respect Microsoft Graph API limits

### 3.4 Email Preferences Integration
- Check user preferences before sending
- Respect quiet hours
- Batch notifications (digest mode option)

### 3.5 Background Job/API Route
**File**: `app/api/notifications/send-emails/route.ts` or cron job
- Process email queue
- Send emails via Microsoft Graph API
- Update notification records with sent status
- Handle errors and retries

---

## Phase 4: Browser Push Notifications (Week 3-4)

### 4.1 Service Worker
**File**: `public/sw.js` or `app/sw.js`
- Register service worker
- Handle push notifications
- Show notification when app is in background
- Handle notification clicks

### 4.2 Push Subscription Management
**File**: `lib/push-subscriptions.ts`
- Table: `PushSubscriptions`
- PartitionKey: `userId`
- RowKey: `subscriptionId` (UUID)
- Fields:
  - `endpoint` (string)
  - `keys` (JSON object with p256dh and auth)
  - `userId` (string)
  - `createdAt` (DateTime)

### 4.3 Push Notification API
**File**: `app/api/notifications/push/route.ts`
- `POST /api/notifications/push/subscribe` - Subscribe to push notifications
- `DELETE /api/notifications/push/unsubscribe` - Unsubscribe
- `POST /api/notifications/push/send` - Send push notification (internal)

### 4.4 Push Notification Service
**File**: `lib/push-notifications.ts`
- `sendPushNotification()` - Send push via Web Push API
- Generate VAPID keys (store in environment variables)
- Encrypt payload
- Handle subscription management

### 4.5 Frontend Push Setup
**File**: `components/notifications/push-setup.tsx`
- Request notification permission
- Subscribe to push notifications
- Show permission status in settings
- Handle permission denied

### 4.6 Dependencies
- `web-push` package for sending push notifications
- VAPID keys generation and storage

---

## Phase 5: Notification Preferences UI (Week 4)

### 5.1 Settings Page Integration
**File**: `app/workspace/[workspaceId]/settings/page.tsx`
- Add "Notifications" section
- Toggle switches for:
  - Email notifications (global)
  - Push notifications (global)
  - In-app notifications (always on)
- Per-type preferences:
  - Card assignments
  - Due dates
  - Mentions
  - Workspace invitations
  - AI actions
- Quiet hours settings
- Timezone selection

### 5.2 Preferences API
**File**: `app/api/notifications/preferences/route.ts`
- `GET /api/notifications/preferences` - Get user preferences
- `PUT /api/notifications/preferences` - Update preferences

### 5.3 React Query Hooks
**File**: `hooks/use-notification-preferences.ts`
- `useNotificationPreferences()` - Fetch preferences
- `useUpdateNotificationPreferences()` - Update mutation

---

## Phase 6: Notification Triggers & Integration (Week 4-5)

### 6.1 Notification Service
**File**: `lib/notification-service.ts`
- `triggerNotification()` - Main entry point
- Determines which channels to use based on preferences
- Creates notification record
- Queues email if enabled
- Sends push if enabled
- Returns notification ID

### 6.2 Integration Points

#### 6.2.1 Card Operations
**Files**: `lib/cards.ts`, `actions/create-card/`, `actions/update-card/`
- Card created → notify board members
- Card assigned → notify assignee
- Card due date set → schedule reminder
- Card moved → notify watchers
- Card updated → notify watchers

#### 6.2.2 List Operations
**Files**: `lib/lists.ts`, `actions/create-list/`
- List created → notify board members

#### 6.2.3 Board Operations
**Files**: `lib/boards.ts`
- Board shared → notify new members

#### 6.2.4 Workspace Operations
**Files**: `lib/workspaces.ts`, `actions/invite-workspace-member/`
- Workspace invitation → notify invitee

#### 6.2.5 AI Agent Actions
**File**: `app/api/board-assistant/route.ts`
- AI action completed → notify user who requested it

#### 6.2.6 Audit Log Integration
**File**: `lib/create-audit-log.ts`
- Optionally trigger notifications based on audit log entries
- Filter by action type and entity type

### 6.3 Scheduled Notifications
**File**: `lib/scheduled-notifications.ts`
- Table: `ScheduledNotifications`
- For due date reminders
- Background job to check and send
- API route: `app/api/notifications/check-due-dates/route.ts`

---

## Phase 7: Real-time Updates (Week 5, Optional)

### 7.1 Polling (Simple)
- Poll `/api/notifications` every 30 seconds
- Update unread count
- Show new notifications

### 7.2 WebSocket (Advanced)
- Set up WebSocket server
- Connect client on page load
- Push new notifications in real-time
- Update UI immediately

---

## Implementation Order & Timeline

### Week 1: Foundation
- [ ] Database schema and core functions
- [ ] Notification types and preferences
- [ ] Basic notification creation

### Week 2: In-App Notifications
- [ ] Notification bell component
- [ ] Notification center UI
- [ ] API routes for notifications
- [ ] React Query hooks
- [ ] Integration with navbar

### Week 3: Email Notifications
- [ ] Email service and templates
- [ ] Email queue system
- [ ] Background job for sending
- [ ] Integration with notification triggers

### Week 4: Push Notifications
- [ ] Service worker setup
- [ ] Push subscription management
- [ ] Push notification service
- [ ] Frontend push setup

### Week 5: Preferences & Polish
- [ ] Notification preferences UI
- [ ] Integration with all triggers
- [ ] Scheduled notifications (due dates)
- [ ] Testing and bug fixes

---

## Technical Considerations

### Dependencies to Add
```json
{
  "web-push": "^3.6.6" // For push notifications
}
```

### Environment Variables
```env
# Push Notifications (VAPID keys)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-email@example.com

# Email (already using Microsoft Graph API)
# No additional config needed
```

### Azure Table Storage Tables
1. `Notifications` - All notifications
2. `NotificationPreferences` - User preferences
3. `PushSubscriptions` - Push notification subscriptions
4. `ScheduledNotifications` - Due date reminders
5. `EmailQueue` - Queued emails to send

### Performance Considerations
- Pagination for notification lists (20-50 per page)
- Index on `userId` and `read` for fast queries
- Batch email sending to respect rate limits
- Cache unread count
- Lazy load notification center

### Security Considerations
- Validate user owns notification before marking as read/delete
- Sanitize notification content
- Rate limit notification creation
- Validate push subscription ownership

---

## Testing Checklist

### In-App Notifications
- [ ] Notification appears when action occurs
- [ ] Unread count updates correctly
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Delete notification works
- [ ] Navigation to entity works
- [ ] Empty state displays correctly
- [ ] Loading states work

### Email Notifications
- [ ] Email sent when enabled
- [ ] Email not sent when disabled
- [ ] Email template renders correctly
- [ ] Quiet hours respected
- [ ] Batch/digest mode works (if implemented)

### Push Notifications
- [ ] Permission request works
- [ ] Subscription created
- [ ] Push notification received
- [ ] Click opens correct page
- [ ] Unsubscribe works

### Preferences
- [ ] Preferences save correctly
- [ ] Preferences affect notification delivery
- [ ] Quiet hours work
- [ ] Per-type preferences work

---

## Future Enhancements (Post-MVP)

1. **Notification Digest**
   - Daily/weekly digest emails
   - Group similar notifications

2. **Smart Notifications**
   - AI-powered importance scoring
   - Mute notifications for inactive boards

3. **Notification Actions**
   - Quick actions from notification (e.g., "Mark as done")
   - Reply to comments from email

4. **Notification Analytics**
   - Track open rates
   - Track click-through rates
   - User engagement metrics

5. **Custom Notification Rules**
   - User-defined rules (e.g., "Only notify me about cards in 'Urgent' list")
   - Workspace-level notification policies

---

## Notes

- Start with in-app notifications (simplest)
- Email notifications leverage existing Microsoft Graph API setup
- Push notifications require service worker and VAPID keys
- Consider using a job queue library (like BullMQ) for production
- For real-time updates, consider using Server-Sent Events (SSE) as a simpler alternative to WebSockets

