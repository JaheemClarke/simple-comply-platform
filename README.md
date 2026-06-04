# Simple Comply Fullstack Website

This version includes:
- Real Node.js backend
- Secure password hashing with bcrypt
- JWT login
- SQLite database
- Document upload storage
- Admin/client role access
- Contact requests saved to database
- SSL-ready HTTPS redirect setting
- Frontend website + client/admin portal

## Setup

1. Install Node.js.
2. Open this folder in terminal.
3. Copy `.env.example` to `.env`.
4. Run:

```bash
npm install
npm run init-db
npm start
```

5. Open:

```text
http://localhost:3000
```

## Default admin login

Email:
admin@simplecomply.gy

Password:
ChangeThisAdminPassword123!

Change this in `.env` before real use.

## SSL Hosting

The code includes HTTPS redirect support:

```env
ENFORCE_HTTPS=true
```

Use this only when deployed behind a real HTTPS proxy such as:
- Nginx with Let's Encrypt
- Render
- Railway
- DigitalOcean App Platform
- VPS with Certbot
- Cloudflare SSL

## Document Storage

Documents are stored in `/uploads`.

Before real launch, move storage to:
- AWS S3
- Supabase Storage
- Google Cloud Storage
- DigitalOcean Spaces

## Important Security Notes

Before real launch:
- Replace JWT_SECRET
- Change admin password
- Use HTTPS
- Use cloud storage
- Add email verification
- Add backup system
- Add audit reporting
- Restrict admin access
