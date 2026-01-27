# Architecture: Better Auth + Convex (Standalone)

## Overview

This application uses **Better Auth** for authentication and **Convex** as the data layer, with a **standalone architecture** that doesn't require Convex Cloud.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
├─────────────────────────────────────────────────────────────┤
│  Better Auth Client (better-auth/react)                     │
│  ├─ signIn.social() - Google OAuth                          │
│  ├─ useSession() - Get session data                         │
│  └─ Session stored in browser (localStorage/cookies)         │
│                                                             │
│  Convex Client (convex/react)                               │
│  ├─ useQuery() - Query Convex data                          │
│  ├─ useMutation() - Call Convex functions                  │
│  └─ Optimistic updates                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server (Astro + Convex)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Better Auth Endpoints                                     │
│  ├─ /api/auth/sign-in/social/google                        │
│  ├─ /api/auth/sign-out                                     │
│  └─ /api/auth/get-session                                  │
│                                                             │
│  Convex Functions (convex/*.ts)                            │
│  ├─ users.ts - User sync and queries                       │
│  ├─ invitations.ts - Officer invitations                    │
│  ├─ onboarding.ts - Direct onboarding                     │
│  └─ Schema: users, officerInvitations, directOnboardings    │
│                                                             │
│  Data Layer: Convex Database                                │
│  ├─ Self-hosted Convex backend (http://localhost:3210)     │
│  ├─ Stores: users, invitations, onboarding, etc.           │
│  └─ Real-time subscriptions available                       │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. **Better Auth Standalone Authentication**

- **Why**: @convex-dev/better-auth requires Convex Cloud, which conflicts with self-hosted requirement
- **Solution**: Use Better Auth as standalone auth server
- **Benefits**: Works with any backend, no vendor lock-in, simpler architecture

### 2. **User ID Mapping**

- **Better Auth**: Uses UUID-based (string) user IDs
- **Convex Traditionally**: Uses v.id() (document ID) references
- **Our Solution**: Store Better Auth's UUID as `authUserId` string field in Convex users table
- **Benefits**: Seamless sync between auth and data layers

### 3. **Schema Changes**

Before (Firebase/Convex Cloud):

```typescript
invitedBy: v.id("users"); // Convex document ID
```

After (Better Auth):

```typescript
invitedBy: v.string(); // Better Auth UUID
invitedBy: v.string(); // For migration: old Convex user IDs
```

### 4. **Authentication Flow**

```
User clicks "Sign in with Google"
    ↓
Better Auth handles OAuth with Google
    ↓
Better Auth creates session (browser storage)
    ↓
Better Auth returns user session with { user: { id, email, name } }
    ↓
Frontend calls Convex syncUser mutation with authUserId
    ↓
Convex creates/updates user record with authUserId
    ↓
App redirects to protected pages
```

### 5. **Data Sync Pattern**

**Initial Sign-in**:

1. User authenticates via Better Auth
2. Frontend gets session with `user.id`
3. Call `convex:syncUser(user.id, email, name, avatar)`
4. Convex creates user record with `authUserId`

**Subsequent Loads**:

1. App checks Better Auth session
2. If session exists, get `user.id` (authUserId)
3. Query Convex: `api.users.getUserByAuthUserId(authUserId)`
4. Use Convex user data for app functionality

## Environment Variables

### Development (.env)

```bash
# Convex (Self-hosted)
VITE_CONVEX_URL=http://localhost:3210
VITE_CONVEX_SITE_URL=http://localhost:4321
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=<generate with script>

# Better Auth
BETTER_AUTH_SECRET=<random-secret>
BETTER_AUTH_URL=http://localhost:4321

# Google OAuth
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

### Production

Same variables, update URLs to production domains.

## Convex Schema Key Fields

### Users Table

```typescript
{
  authUserId: string,        // Better Auth UUID (NEW)
  email: string,
  name: string,
  avatar?: string,
  role: "Member" | "General Officer" | "Executive Officer" | ...,
  status: "active" | "inactive" | "suspended",
  joinDate: number,          // Timestamp
  lastLogin?: number,        // Timestamp
  invitedBy?: string,        // Better Auth UUID (changed from v.id)
  // ... other fields
}
```

### Officer Invitations Table

```typescript
{
  invitedBy: string,         // Better Auth UUID (changed from v.id)
  email: string,
  role: string,
  position: string,
  status: "pending" | "accepted" | "declined" | "expired",
  // ... other fields
}
```

## Functions

### Convex Functions (convex/\*.ts)

**users.ts**:

- `getCurrentUser` - Get current user (requires authUserId from session)
- `syncUser(authUserId, email, name, avatar)` - Create/update user
- `getUserByAuthUserId(authUserId)` - Lookup user by Better Auth ID
- `hasOfficerRole` - Check permission level

**invitations.ts**:

- `listRecent` - List invitations
- `create` - Send invitation (requires invitedBy authUserId)
- `getById` - Get invitation details
- `accept` - Accept invitation (requires user authUserId)
- `resend` - Resend invitation
- `getStats` - Get invitation statistics

**onboarding.ts**:

- `listRecent` - List direct onboardings
- `createDirectOnboarding` - Fast-track user (requires authUserId)
- `getByUserId` - Get onboarding by user ID

### Frontend Hooks (src/lib/auth-client.ts)

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL,
});

export const { useSession, signIn, signOut } = authClient;
```

## Data Migration Path (Future)

### Phase 1: Current State

- Better Auth handles new sign-ins
- Convex stores new user records
- Old Firebase data remains untouched

### Phase 2: Migration (When Ready)

1. Add Firebase Admin SDK to server
2. Create migration endpoint that:
   - Fetches user data from Firebase by email
   - Creates Convex user with same fields
   - Sets `authUserId: <better-auth-id>` when Firebase user signs in
3. Updates onboarding to prefer Convex over Firebase

### Phase 3: Cleanup (Post-Migration)

- Remove Firebase dependencies
- Archive Firebase database
- Update all references to use Convex only

## Deployment

### Self-Hosted Convex Setup

See: `/Users/chark1es/Stuff/GitHub/ieeeatucsd-org/REPOSITORY/SELF_HOSTING_GUIDE.md`

Key steps:

1. Run `docker compose up` (pulls Convex + Dashboard)
2. Generate admin key: `docker compose exec backend ./generate_admin_key.sh`
3. Add admin key to `.env` as `CONVEX_SELF_HOSTED_ADMIN_KEY`
4. Run `bunx convex dev` to push schema to self-hosted backend

### Better Auth Deployment

1. Deploy Astro app (Node.js adapter)
2. Better Auth endpoints work seamlessly
3. Session storage: Choose between:
   - **Development**: LocalStorage/SessionStorage
   - **Production**: HttpOnly cookies (configure in Astro)

## Security Considerations

### Session Management

- Better Auth sessions stored securely in browser
- JWT-based (configurable expiration)
- Convex functions validate authUserId on every operation

### Authorization Checks

```typescript
// In Convex functions
export const createInvitation = mutation({
  args: { /* ... */, authUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user || !["Executive Officer", "Administrator"].includes(user.role)) {
      throw new Error("Unauthorized");
    }

    // Proceed with creating invitation
  },
});
```

### XSS Protection

- Better Auth handles CSRF protection automatically
- Better JWT validation against tampering
- Convex functions run server-side (no client-side exec)

## Performance Optimizations

1. **Indexes on authUserId**: Fast lookups for user operations
2. **Convex subscriptions**: Real-time updates without polling
3. **Optimistic UI**: Immediate feedback with background sync
4. **Session caching**: Avoid repeated auth checks

## Future Enhancements

1. **Email Integration**: Add Better Auth email provider
2. **Role Management**: Add Convex functions for role changes
3. **Audit Logging**: Track all role/permission changes
4. **Profile Updates**: Allow users to update their Convex profiles
5. **Sessions Manager**: View/manage active sessions

## Troubleshooting

### "User not found" errors

- Check that `authUserId` matches Better Auth's user.id
- Verify user sync was called after sign-in
- Check Convex logs for sync errors

### Permission denied on Onboarding

- Verify user role in Convex
- Ensure authUserId is being passed to mutations
- Check that `hasOfficerRole` query is returning true

### Convex connection refused

- Ensure self-hosted Convex is running (port 3210)
- Check `VITE_CONVEX_URL` is correct
- Verify admin key is set correctly

## Migration from Firebase to Convex

See: `/Users/chark1es/Stuff/GitHub/ieeeatucsd-org/docs/firebase-schema.md`

Key mappings:

- `firebase.auth().currentUser.uid` → Better Auth `user.id`
- `Timestamp` → `number` (milliseconds since epoch)
- `DocumentReference` → `string` (Better Auth UUID)
- `Collection` → Convex table name
