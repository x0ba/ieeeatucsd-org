# Dashboard V2 - Convex Migration

This is the new dashboard implementation using **Convex** and **Better Auth** instead of Firebase.

## Tech Stack

- **Framework**: Astro
- **UI Components**: HeroUI (React)
- **Backend**: Convex (self-hosted)
- **Authentication**: Better Auth with Convex integration
- **Database**: Convex (migrated from Firebase Firestore)
- **Styling**: TailwindCSS
- **Package Manager**: Bun

## Setup Instructions

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Convex Deployment
CONVEX_DEPLOYMENT=dev
VITE_CONVEX_URL=http://localhost:3210
CONVEX_SITE_URL=http://localhost:4321

# Better Auth - Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Firebase (for future migration only - not currently used)
PUBLIC_FIREBASE_WEB_API_KEY=
PUBLIC_FIREBASE_AUTH_DOMAIN=
PUBLIC_FIREBASE_PROJECT_ID=
PUBLIC_FIREBASE_STORAGE_BUCKET=
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
PUBLIC_FIREBASE_APP_ID=
```

### 3. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new OAuth 2.0 Client ID
3. Add authorized origins:
   - `http://localhost:4321` (local development)
   - Your production domain
4. Add authorized redirect URIs:
   - `http://localhost:4321/signin/callback`
   - Your production domain + `/signin/callback`
5. Copy Client ID and Client Secret to your `.env` file

### 4. Initialize Convex

First, ensure you have the Convex CLI installed:

```bash
bunx convex dev
```

This will:

- Create a new or configure an existing Convex project
- Generate TypeScript types in `convex/_generated/`
- Run the Convex local development server

**Note**: For self-hosted Convex, you may need to configure this separately. Update the `CONVEX_DEPLOYMENT` in `.env` to point to your self-hosted instance.

### 5. Start Development Server

In a new terminal, start the Astro dev server:

```bash
bun run dev
```

The dashboard will be available at `http://localhost:4321`.

### 6. Access the Application

- **Sign In Page**: `http://localhost:4321/signin`
- **Onboarding Page**: `http://localhost:4321/onboarding` (requires Executive Officer or Administrator role)
- **Overview**: `http://localhost:4321/overview`

## Project Structure

```
dashboard-v2/
├── convex/
│   ├── schema.ts              # Database schema matching Firebase structure
│   ├── auth.config.ts         # Better Auth configuration
│   ├── auth.ts                # Better Auth instance with Convex
│   ├── http.ts                # HTTP routes for authentication
│   ├── users.ts               # User-related Convex functions
│   ├── invitations.ts         # Officer invitation functions
│   ├── onboarding.ts          # Direct onboarding functions
│   └── _generated/            # Auto-generated Convex types
├── src/
│   ├── components/
│   │   ├── providers/
│   │   │   └── ConvexClientProvider.tsx  # Convex and Better Auth provider
│   │   ├── auth/
│   │   │   ├── SignInContent.tsx          # Sign-in page component
│   │   │   ├── CircuitBackground.tsx      # Animated background
│   │   │   └── BlueIEEELogo.tsx          # Logo component
│   │   └── onboarding/
│   │       ├── OnboardingContent.tsx      # Main onboarding page
│   │       ├── InvitationFlowTab.tsx      # Invitation tab
│   │       ├── DirectOnboardingTab.tsx    # Direct onboarding tab
│   │       └── PendingInvitationsTab.tsx  # Pending invitations tab
│   ├── lib/
│   │   ├── auth-client.ts       # Better Auth client
│   │   └── types.ts             # TypeScript types
│   ├── pages/
│   │   ├──signin/
│   │   │   └── index.astro      # Sign-in page
│   │   ├── onboarding/
│   │   │   └── index.astro      # Onboarding page
│   │   └── overview/
│   │       └── index.astro      # Overview page (placeholder)
│   └── styles/
│       └── global.css           # Global styles from dashboard
├── public/
│   └── logos/                   # Static assets
├── astro.config.mjs             # Astro configuration
├── tailwind.config.mjs          # Tailwind CSS configuration
├── convex.json                  # Convex configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies
```

## Key Features Implemented

### ✅ Authentication

- **Google OAuth** via Better Auth
- **Session management** with Convex
- **User sync** on first sign-in
- **Invite processing** from URL parameters

### ✅ Onboarding

- **Invitation Flow**: Send invitations that require acceptance
- **Direct Onboarding**: Immediately onboard officers without acceptance
- **Pending Invitations**: View and manage all invitations
- **Permission-based Access**: Only Executive Officers and Administrators can access

### ✅ Database Schema

Complete migration of Firebase collections to Convex:

- `users` - User profiles with all Firebase fields
- `officerInvitations` - Officer invitation records
- `sponsorDomains` - Sponsor email domain mappings
- `invites` - User invitation records
- `notifications` - User notifications
- `googleGroupAssignments` - Google Group assignments
- `directOnboardings` - Direct onboarding records
- `events` - Published events (for future use)
- `eventRequests` - Event requests (for future use)
- `reimbursements` - Reimbursement requests (for future use)
- And more...

## Authentication Flow

1. User clicks "Continue with Google"
2. Better Auth redirects to Google OAuth
3. User authenticates with Google
4. Better Auth creates a session
5. User is redirected to callback/overview
6. Convex `syncUser` mutation creates or updates user record
7. If invite ID present, process invite acceptance

## Onboarding Workflow

### Executive Officer/Administrator Access

1. Sign in via Google OAuth
2. Navigate to `/onboarding`
3. Choose one of three tabs:
   - **Invitation Flow**: Send invitations that user must accept
   - **Direct Onboarding**: Immediately add user without acceptance
   - **Pending Invitations**: View and resend existing invitations

### Permission Checks

- Only users with role `"Executive Officer"` or `"Administrator"` can access
- Role is verified via Convex query `api.users.hasOfficerRole`

## Future Implementation Status

### 🚧 Not Yet Implemented

- [ ] Firebase to Convex data migration (will be added later)
- [ ] Complete dashboard layout with sidebar/navbar
- [ ] All dashboard features (events, reimbursements, etc.)
- [ ] File storage with Convex
- [ ] Email notifications
- [ ] Google Groups integration

The current implementation focuses on **Login and Onboarding pages only** as specified.

## Testing

After setup, test the following:

1. **Sign In Flow**:
   - Visit `/signin`
   - Click "Continue with Google"
   - Authenticate with Google account
   - Verify user creation in Convex

2. **Onboarding Access**:
   - Manually update a user's role to "Executive Officer" in Convex dashboard
   - Visit `/onboarding`
   - Verify access is granted

3. **Send Invitation**:
   - Test sending an invitation via the Invitation Flow tab
   - Verify invitation is created in Convex (via dev dashboard or Convex CLI)

## TypeScript Types

After running `bunx convex dev`, Convex will generate TypeScript types in `convex/_generated/`. This will resolve all `@ts-ignore` comments in the code.

## Self-Hosted Convex

For self-hosted Convex deployment:

1. Update `CONVEX_DEPLOYMENT` env var to point to your self-hosted instance
2. Ensure the Convex HTTP server is running and accessible
3. Configure VITE_CONVEX_URL to point to your self-hosted instance
4. No changes needed to the codebase - it works with both Convex Cloud and self-hosted

## Troubleshooting

### Convex Types Not Generating

If you see TypeScript errors about missing `_generated`:

```bash
bunx convex dev
```

This will run once to generate types.

### Better Auth Not Working

1. Verify CONVEX_SITE_URL matches your dev server URL
2. Check Google OAuth redirect URIs include your callback URL
3. Ensure Convex HTTP server is running (usually on port 3210)

### Permission Denied on Onboarding

1. Check user role in Convex dashboard
2. Ensure role is either "Executive Officer" or "Administrator"
3. Try refreshing the page

## License

Same as the main IEEE at UCSD project.
