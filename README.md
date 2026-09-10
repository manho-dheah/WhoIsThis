# منهو؟ — Faculty Ratings MVP

A password-gated, anonymous faculty/course feedback website built for GitHub + Netlify + Supabase.

## What is already implemented

- One shared student access password (no student accounts)
- Password verified server-side; it is never shipped to the browser or committed to GitHub
- Signed HttpOnly student session cookie
- Searchable faculty directory
- Faculty profile with average ratings and written experiences
- Anonymous review submission
- Soft duplicate protection: one review per professor + academic term + browser/device identifier
- Review reporting
- Separate admin password and dashboard
- Admin can add faculty and hide/restore reviews
- Persistent database in Supabase, independent from GitHub deployments
- Supabase locked behind RLS; service-role key stays only in Netlify environment variables

## 1. Create Supabase database

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Paste and run `schema.sql`.
4. In Supabase Project Settings > API, copy:
   - Project URL
   - `service_role` key — **keep this secret**.

## 2. Create Netlify environment variables

In Netlify > Site configuration > Environment variables add:

```text
STUDENT_ACCESS_PASSWORD=your-shared-student-password
ADMIN_PASSWORD=a-different-strong-admin-password
SESSION_SECRET=a-long-random-secret-at-least-32-characters
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Never place these values in HTML, JavaScript, GitHub, or screenshots.

## 3. Deploy from GitHub

1. Create a new GitHub repository.
2. Upload all project files.
3. In Netlify choose **Add new site > Import an existing project > GitHub**.
4. Select the repo.
5. Netlify reads `netlify.toml`; no special build command is required.
6. Add the environment variables above and redeploy.

After that, every GitHub commit updates the website while Supabase data stays untouched.

## 4. Local development (optional)

Install Node.js, then:

```bash
npm install
npx netlify dev
```

Create a local `.env` with the same environment variables. `.env` should never be committed.

## Important privacy/security note

The browser identifier is only a **soft anti-spam measure**, not proof of identity. A student can clear browser storage or change browsers. If stronger one-person-one-review enforcement is ever required, individual authentication or invitation tokens are needed.

Also keep the site framed around academic experience, not personal attacks. Publish clear community rules and a reporting/removal process.
