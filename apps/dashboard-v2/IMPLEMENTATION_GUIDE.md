# Better Auth + Convex Implementation Guide

## Quick Start

This guide walks you through using **Better Auth** for authentication with **Convex** as the data layer in the dashboard-v2 application.

## Prerequisites

1. Self-hosted Convex backend running (or Convex Cloud)
2. Google OAuth credentials (Google Cloud Console)
3. Node.js 18+ and bun package manager

## Step 1: Start Convex Backend

```bash
# If using self-hosted Convex
cd /path/to/convex-backend/self-hosted/docker
docker compose up

# Generate admin key
docker compose exec backend ./generate_admin_key.sh
```

Add the admin key to your `.env` file:

```bash
CONVEX_SELF_HOSTED_ADMIN_KEY=<admin-key-from-above>
```

## Step 2: Configure Environment Variables

Create/edit `.env`:

```bash
# Convex
VITE_CONVEX_URL=http://localhost:3210
VITE_CONVEX_SITE_URL=http://localhost:4321
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=<your-admin-key>

# Better Auth
BETTER_AUTH_SECRET=generate-random-secret-change-in-prod
BETTER_AUTH_URL=http://localhost:4321

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
```

## Step 3: Push Convex Schema

```bash
bun install
bunx convex dev
```

This will:

- Generate TypeScript types in `convex/_generated/`
- Push schema to Convex backend
- Start watching for changes

## Step 4: Start Development Server

In a new terminal:

```bash
bun run dev
```

Visit `http://localhost:4321/signin`

## Step 5: Test Authentication Flow

1. Click "Continue with Google"
2. Sign in with a Google account
3. User should be redirected to `/overview`
4. Check Convex dashboard (http://localhost:6791) - user should appear in `users` table

## Step 6: Test Onboarding (Requires Officer/Admin Role)

1. Manually update user role in Convex:
   - Go to Convex Dashboard
   - Open `users` table
   - Find your user
   - Set `role` to "Executive Officer" or "Administrator"

2. Visit `http://localhost:4321/onboarding`

3. Test:
   - Sending an invitation (Invitation Flow tab)
   - Direct onboarding (Direct Onboarding tab)
   - Viewing pending invitations (Pending Invitations tab)

## Key Files Explained

### Authentication

- `src/lib/auth-client.ts` - Better Auth client configuration
- `src/lib/auth-config.ts` - Better Auth server configuration
- `src/components/providers/ConvexClientProvider.tsx` - Providers wrapper

### Convex Functions

- `convex/schema.ts` - Database schema
- `convex/users.ts` - User lookups and sync
- `convex/invitations.ts` - Officer invitations
- `convex/onboarding.ts` - Direct onboarding

### React Components

- `src/components/auth/SignInContent.tsx` - Sign-in page
- `src/components/onboarding/OnboardingContent.tsx` - Onboarding page
- `src/components/onboarding/InvitationFlowTab.tsx` - Send invitations
- `src/components/onboarding/DirectOnboardingTab.tsx` - Direct onboarding
- `src/components/onboarding/PendingInvitationsTab.tsx` - View/manage invitations

## Common Issues

### Better Auth not working

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check redirect URIs in Google Cloud Console include your site URL
- Ensure `BETTER_AUTH_URL` matches your dev server URL

### Convex connection failed

- Verify Convex backend is running on port 3210
- Check `VITE_CONVEX_URL` in `.env`
- Ensure admin key is valid

### Permission denied on onboarding

- Manually set user role to "Executive Officer" or "Administrator"
- Refresh the page after changing role
- Check that user is signed in

### User not syncing to Convex

- Check browser console for sync errors
- Verify `syncUser` mutation is being called after sign-in
- Check Convex logs for function errors

## Next Steps

After basic setup:

1. **Configure Google OAuth**: Create OAuth 2.0 credentials in Google Cloud Console
2. **Test real user flow**: Sign up new users, test invitation acceptance
3. **Set up production**: Deploy Astro app, configure self-hosted Convex
4. **Implement other features**: Events, reimbursements, etc.

## Google OAuth Setup Guide

### 1. Create Google Cloud Project

Go to [Google Cloud Console](https://console.cloud.google.com)

1. Click "Create Project"
2. Name it (e.g., "ieee-dashboard-v2")
3. Click "Create"

### 2. Enable Google+ API

1. Navigate to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

### 3. Create OAuth 2.0 Client ID

1. Navigate to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "IEEE Dashboard V2"
5. Authorized JavaScript origins:
   - `http://localhost:4321` (development)
   - Your production domain
6. Authorized redirect URIs:
   - `http://localhost:4321/signin/callback`
   - Your production domain + `/signin/callback`
7. Click "Create"
8. Copy Client ID and Client Secret to `.env`

### 4. Configure OAuth Consent Screen

1. Navigate to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in:
   - App name: "IEEE UCSD Dashboard"
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
4. Add scopes if needed (basic profile is sufficient)
5. Submit for verification (may take days, but works for testing immediately)

## Convex Self-Hosted Setup

See full guide in REPOSITORY/SELF_HOSTING_GUIDE.md but here's the quick version:

```bash
# Clone Convex backend
git clone https://github.com/get-convex/convex-backend.git
cd convex-backend/self-hosted/docker

# Start services
docker compose up

# In another terminal (your app directory)
bunx convex dev
```

Convex Dashboard: http://localhost:6791
Convex Backend: http://localhost:3210

## Testing Checklist

- [ ] Convex backend is running
- [ ] Google OAuth credentials configured
- [ ] Sign-in with Google works
- [ ] User appears in Convex users table
- [ ] Manual role change to "Executive Officer" works
- [ ] Onboarding page loads without permission errors
- [ ] Can send officer invitation
- [ ] Can do direct onboarding
- [ ] Can view pending invitations
- [ ] Resend invitation works

## Production Deployment

### Deploy Astro App

```bash
bun run build
# Deploy dist/ to your hosting provider (Vercel, Netlify, etc.)
```

### Deploy Self-Hosted Convex

Follow the Convex self-hosting guide to deploy to:

- Fly.io
- Railway.com
- Your own servers
- Managed Docker hosting

### Configure Production Environment

Update environment variables with production URLs:

```bash
VITE_CONVEX_URL=https://your-convex-url.com
VITE_CONVEX_SITE_URL=https://your-domain.com
BETTER_AUTH_URL=https://your-domain.com
```

## Resources

- Better Auth Docs: https://better-auth.com
- Convex Docs: https://docs.convex.dev
- Self-Hosted Convex: https://github.com/get-convex/convex-backend/blob/main/self-hosted/README.md
- Google OAuth Setup: https://console.cloud.google.com

## Support

For issues:

- Better Auth: https://discord.gg/better-auth
- Convex: #self-hosted channel in https://discord.gg/convex
- This project: Create issue in GitHub repository
