# 🎓Administrative System

A complete **cross-platform** academic management system for course enrollment, ratings, and complaints — available as both a **Web App** and **Mobile App** (React Native Expo).

## Platforms

| Platform | Technology | Status |
|----------|------------|--------|
| 🌐 Web App | React.js | ✅ Fully functional |
| 📱 Mobile App | React Native (Expo) | ✅ Fully functional |

## Features

### Admin
- Manage courses, groups, and schedules
- User management (block, unblock, promote, demote, delete)
- Enroll students in courses with group selection
- Approve/reject enrollment change requests

### Student
- Self-enrollment (max 5 courses)
- Rate courses and instructors (1-10 scale)
- View, edit, and delete ratings
- Submit enrollment problem reports
- Track request status (Pending/Approved/Rejected)
- Dashboard with recent activity and it's state 

## Tech Stack

| Layer | Technology |
|-------|------------|
| Web Frontend | React.js |
| Mobile Frontend | React Native (Expo) |
| Backend & Database | Firebase (Auth, Firestore, Hosting) |
| Styling | CSS3 with Dark Mode support |

## Quick Start

### Web App
```bash
cd web-react
npm install
npm start
 
