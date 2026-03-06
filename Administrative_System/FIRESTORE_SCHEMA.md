# Firestore Database Schema

This document describes the optimal Firestore structure for the Ticketing System and Course Feedback app.

---

## Collections Overview

```
📁 users/              (user profiles + role)
📁 tickets/            (support tickets)
📁 ticketMessages/     (messages within tickets)
📁 ticketCategories/   (ticket categories)
📁 courses/            (courses for feedback)
📁 feedback/           (course feedback submissions)
📁 enrollments/        (user enrollments in courses)
```

---

## 1. Users Collection

**Path:** `users/{userId}`  
**Document ID:** Firebase Auth UID

| Field       | Type     | Description                    |
|------------|----------|--------------------------------|
| email      | string   | User's email                   |
| displayName| string?  | Optional display name          |
| role       | string   | `"admin"` \| `"user"`          |
| createdAt  | timestamp| Account creation time          |
| updatedAt  | timestamp| Last profile update            |

**Example:**
```json
{
  "email": "admin@example.com",
  "displayName": "Admin User",
  "role": "admin",
  "createdAt": "2025-02-28T12:00:00Z",
  "updatedAt": "2025-02-28T12:00:00Z"
}
```

**Relationships:** Referenced by `tickets.createdBy`, `feedback.userId`, `enrollments.userId`

---

## 2. Ticketing System

### tickets

**Path:** `tickets/{ticketId}`

| Field       | Type     | Description                    |
|------------|----------|--------------------------------|
| title      | string   | Ticket title                   |
| description| string   | Ticket description             |
| categoryId | string   | Reference to ticketCategories  |
| status     | string   | `"open"` \| `"in_progress"` \| `"resolved"` \| `"closed"` |
| priority   | string   | `"low"` \| `"medium"` \| `"high"` \| `"urgent"` |
| createdBy  | string   | User UID                       |
| assignedTo | string?  | Admin UID (optional)           |
| createdAt  | timestamp|                                |
| updatedAt  | timestamp|                                |

### ticketMessages (subcollection)

**Path:** `tickets/{ticketId}/messages/{messageId}`

| Field     | Type     | Description                    |
|----------|----------|--------------------------------|
| content  | string   | Message text                   |
| senderId | string   | User UID                       |
| senderRole| string  | `"user"` \| `"admin"`          |
| createdAt| timestamp|                                |

### ticketCategories

**Path:** `ticketCategories/{categoryId}`

| Field  | Type    | Description                    |
|--------|---------|--------------------------------|
| name   | string  | Category name                  |
| slug   | string  | URL-friendly slug              |
| order  | number  | Display order                  |

---

## 3. Course Feedback System

### courses

**Path:** `courses/{courseId}`

| Field      | Type     | Description                    |
|-----------|----------|--------------------------------|
| title     | string   | Course title                   |
| code      | string   | Course code (e.g., CS101)      |
| instructor| string   | Instructor name                |
| startDate | timestamp|                                |
| endDate   | timestamp|                                |
| createdAt | timestamp|                                |
| updatedAt | timestamp|                                |

### feedback

**Path:** `feedback/{feedbackId}`

| Field    | Type     | Description                    |
|----------|----------|--------------------------------|
| courseId | string   | Reference to courses           |
| userId   | string   | User UID                       |
| rating   | number   | 1-5 stars                      |
| comment  | string?  | Optional text feedback         |
| createdAt| timestamp|                                |

### enrollments

**Path:** `enrollments/{enrollmentId}`  
**Document ID:** `{userId}_{courseId}` (for uniqueness)

| Field    | Type     | Description                    |
|----------|----------|--------------------------------|
| userId   | string   | User UID                       |
| courseId | string   | Course reference               |
| enrolledAt| timestamp|                               |

---

## Indexes (Create in Firestore Console)

1. **tickets:** `status` (Asc), `createdAt` (Desc)
2. **tickets:** `createdBy` (Asc), `createdAt` (Desc)
3. **feedback:** `courseId` (Asc), `createdAt` (Desc)
4. **feedback:** `userId` (Asc), `courseId` (Asc) — unique per user per course

---

## Relationship Diagram

```
users ──┬── tickets (createdBy)
        ├── ticketMessages (senderId)
        ├── feedback (userId)
        └── enrollments (userId)

ticketCategories ── tickets (categoryId)
courses ──┬── feedback (courseId)
          └── enrollments (courseId)
```
