# Smart School Rwanda Frontend (React + TypeScript)

## Quick start
1. `cp .env.example .env`
2. `npm install`
3. `npm run dev`

## Stack
- React Router
- TanStack Query
- React Hook Form + Zod
- Tailwind CSS

## Core routes
- `/login`
- `/`
- `/tenants/new` (SuperAdmin)
- `/setup` (SchoolAdmin setup wizard)
- `/academics` (SchoolAdmin academics CRUD)
- `/staff` (SchoolAdmin invites)
- `/accept-invite` (public invite accept)
- `/users`
- `/unauthorized`

## E-Running (e-learning platform, built on this codebase)
- Hierarchy reuses existing tables: GradeLevel → ClassRoom → Subject → Course (+ new Section → Activity)
- Enrollment stays class-level; same locales (en/rw/fr); same plan-gated public access
- Public browsing: `/programs` (levels → classes), `/courses` (catalog), `/student/courses/:id` (course detail), `/student/my-learning` (My Courses + progress)
- No new folders: improvements land in existing slices (`src/features/sprint4/` for LMS, `src/api/academy-api.ts` for catalog, `src/pages/` for browse/course pages); shared UI stays in `src/components/ui/`
