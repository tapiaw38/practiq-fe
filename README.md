# Practiq Frontend

Practiq frontend application for teachers and students, built with Vue 3, TypeScript, Vite, Pinia, and PrimeVue.

## Overview

Practiq is an education platform focused on structured practice, level progression, teacher-created content, notebooks, practice sheets, and AI-assisted feedback.

The frontend talks to two backend services:

- Auth API: authentication, users, roles, and password flows.
- Practiq API: academic data, courses, content, progress, notebooks, AI assistant proxy, and learning strategies.

## Requirements

- Node.js 18+
- npm
- Auth API running on `http://localhost:8082`
- Practiq API running on `http://localhost:8083`

## Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Available variables:

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_AUTH_API_URL` | Auth API base URL | `http://localhost:8082` |
| `VITE_PRACTIQ_API_URL` | Practiq API base URL | `http://localhost:8083` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID used by the login button | none |

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

The Vite development server normally runs at `http://localhost:5173`.

When running through the root Docker Compose stack, the frontend is exposed at:

```text
http://app.practiq.localhost
http://localhost:5174
```

## Production Build

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

```text
practiq-fe/
├── src/
│   ├── api/request/          # Axios instances and token helpers
│   ├── assets/               # Global CSS, theme tokens, and static assets
│   ├── components/
│   │   ├── auth/             # Authentication components
│   │   ├── student/          # Student-scoped components
│   │   ├── teacher/          # Teacher-scoped components
│   │   └── ui/               # Shared UI components
│   ├── composables/          # Feature composables used by views
│   ├── layouts/              # Student and teacher layouts
│   ├── router/               # Routes and auth guards
│   ├── services/             # API service classes by module
│   ├── stores/               # Pinia stores by module
│   ├── types/                # TypeScript types split by module
│   ├── utils/                # Shared formatting and assistant helpers
│   └── views/
│       ├── student/          # Student pages
│       └── teacher/          # Teacher/admin pages
├── public/
├── index.html
└── vite.config.ts
```

## Module Pattern

Most feature modules follow the same layering:

1. `services/<module>/<module>Service.ts`
   API calls. Services receive an Axios instance instead of importing a singleton directly.

2. `stores/<module>Store.ts`
   Pinia state and actions for the module.

3. `composables/use<Module>.ts`
   View-facing API. Composables create the service, connect the store, and handle user-facing toast messages.

4. `types/<module>.ts`
   Request, response, model, and entity types for the module.

5. `components/<role>/<module>/`
   Extracted view components. Component props and emits live next to the component in a `.types.ts` file.

Basic authentication is a special case and still uses `authService` directly where needed.

## Main Modules

- `ai`
- `assignments`
- `authAdmin`
- `courses`
- `exercises`
- `grades`
- `levels`
- `materials`
- `notebooks`
- `practiceSheets`
- `profile`
- `progress`
- `strategy`
- `subjects`
- `topics`

## Authentication Flow

1. User logs in through `/login`.
2. The frontend calls the Auth API.
3. The received JWT is stored in `localStorage` as `practiq_token`.
4. The user profile is synchronized with the Practiq API.
5. The router redirects by profile type:
   - Teacher: `/teacher/dashboard`
   - Student: `/student/dashboard`
6. Axios request interceptors attach the token to Auth API and Practiq API requests.

## Teacher Features

- Course, subject, and grade management.
- Topic management.
- Exercises with text, equation, canvas, multiple-choice, and handwritten modes.
- Materials.
- Practice sheets and level tests.
- Notebooks and notebook page editing.
- Student progress review.
- Notebook submission review with AI and teacher feedback.
- Learning strategy management and course assignments.

## Student Features

- Course dashboard with progress and review prompts.
- Level-based course navigation.
- Practice sessions with text, equation, canvas, and multiple-choice answers.
- Level tests.
- Notebook completion and submission.
- AI assistant widget with written, oral, and whiteboard modes.
- Progress tracking and feedback.

## Shared UI and Utilities

Global reusable components live in `src/components/ui`, including:

- `ConfirmModal`
- `MathFieldEditor`
- `Skeleton`

Shared helpers live in `src/utils`, including:

- `assistantExerciseContext.ts`
- `formatters.ts`

## Tech Stack

- Vue 3 with Composition API and `<script setup>`
- TypeScript
- Vite
- Pinia
- Vue Router
- Axios
- PrimeVue 4 and PrimeIcons
- KaTeX and MathLive for equation rendering/editing
- Marked for Markdown rendering

## Useful Commands

```bash
npm run dev
npm run build
npm run preview
```

## Docker

From the repository root, the full local stack can be started with:

```bash
docker compose up -d --build
```

The frontend service is named `practiq-fe` and is exposed by the root Compose file through Traefik at `app.practiq.localhost`.
