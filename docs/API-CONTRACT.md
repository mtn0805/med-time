# MedTime API contract

Base `/api`. JSON success `{data: T}`, error `{error:{code,message,details?}}`. Shared DTOs are in `@medtime/shared`. IDs are strings. All timestamps ISO UTC; clinic dates and hours use Asia/Jerusalem. JWT in HttpOnly SameSite cookie. Client requests same-origin `/api` via Vite proxy. Never put tokens in localStorage. Role selected on login is checked against stored role; registration always creates patients.

- POST /auth/register `{name,email,password,phone}` -> User, sets cookie
- POST /auth/login `{email,password,role}` -> User, sets cookie
- POST /auth/logout -> `{success:true}`
- GET /auth/me -> User (401 if anonymous)
- PATCH /auth/me `{name,phone}` -> User
- GET /doctors?specialty=&search= -> Doctor[] (public)
- GET /doctors/:id/availability?date=YYYY-MM-DD -> Slot[] (public)
- GET /appointments?from=ISO&to=ISO -> Appointment[] (patient own, doctor own, admin all; bounded results)
- POST /appointments `{doctorId,startAt,note?,patientId?}` -> Appointment (patientId only admin)
- PATCH /appointments/:id/cancel -> Appointment (patient owner or admin, future scheduled only)
- PATCH /appointments/:id/visit `{status:'completed'|'no_show',visitSummary?,prescription?}` -> Appointment (assigned doctor only)
- GET /patients/:id/history -> Appointment[] (patient self, assigned doctor with legitimate appointment relation, admin; completed visits)
- POST /feedback `{category:'suggestion'|'issue',message}` -> Feedback (authenticated)
- GET /admin/feedback -> Feedback[]
- GET /admin/users?search= -> User[]
- POST /admin/patients `{name,email,phone,password}` -> User
- POST /admin/doctors `{name,email,phone,password,specialty,bio,slotMinutes,workingHours}` -> Doctor
- PATCH /admin/doctors/:id `{specialty?,bio?,slotMinutes?,workingHours?,active?}` -> Doctor
- PATCH /admin/users/:id `{name?,phone?,active?}` -> User (prevent last/self admin deactivation)
- GET /events -> SSE, public generic `data: {"type":"appointments.updated"}`; no private data; UI refetches availability and own appointments on changes.
- GET /health -> `{data:{status:'ok'}}` only if DB ready.

Development seed must be explicit and never auto-created on production startup. Seed credentials documented by backend agent. Admin profile and patient admin form support changes. UI language Hebrew RTL. Visit summaries and patient instructions are implemented as internal text. Structured prescriptions and PDF export were not specified and are not included.
