# DOLE Region IV-A TUPAD Portal

A small Node.js/Express portal starter with a login page, JWT-protected `/api/me` endpoint, and a basic dashboard.

## Requirements

- Node.js 18 or newer
- npm

## 1. Install dependencies

```bash
npm install
```

## 2. Configure credentials

Copy `.env.example` to `.env` and edit it:

```env
PORT=3000
PORTAL_USERNAME=your_admin_username
PORTAL_PASSWORD_HASH=paste_a_bcrypt_hash_here
JWT_SECRET=replace_with_a_long_random_secret
```

Generate a bcrypt password hash (replace the example password with your own):

```bash
node -e "console.log(require('bcryptjs').hashSync('ChangeThisPassword!', 12))"
```

Copy the resulting hash into `PORTAL_PASSWORD_HASH`. Do not put the plain-text password in `.env`.

Generate a JWT secret with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste that value into `JWT_SECRET`. Keep `.env` private and never commit or upload it.

## 3. Start the portal

```bash
npm start
```

Open:

- Login: http://localhost:3000/
- Dashboard: http://localhost:3000/dashboard.html
- API health check: http://localhost:3000/api/health

The dashboard redirects to the login page unless it has a valid session token. The login token expires after 8 hours and is stored in the browser's `sessionStorage`; signing out clears it.

## Project structure

```text
tupad-portal-main/
├── index.html              # Login page
├── server.js               # Express server and authentication API
├── package.json
├── .env.example            # Environment variable template
├── .gitignore
└── public/
    └── dashboard.html      # Dashboard
```

## Troubleshooting

- **Authentication system is not configured:** check that `.env` exists in the project root and all three required variables are populated.
- **Invalid username or password:** confirm `PORTAL_USERNAME` and regenerate the bcrypt hash for the password you intend to use.
- **Cannot connect:** make sure `npm start` is running and open the same port shown in the terminal.
- **Port already in use:** change `PORT` in `.env`, then open that port in your browser.

## Important scope and deployment notes

This ZIP repairs the login-to-dashboard flow in the supplied starter project. It does not include a TUPAD beneficiary database, application/encoding forms, file uploads, reports, user roles, or administrative modules because those features were not present in the uploaded source.

Before public deployment, use HTTPS, a managed secrets store, secure server-side sessions or secure HttpOnly cookies, persistent user storage, audit logging, backups, and appropriate access controls. Do not use sample credentials in production.
