# Forgot Password Implementation

Complete end-to-end forgot password flow implemented for Roman Series.

## Frontend Pages Created

### 1. **Login Page** (`/apps/web/app/login/page.tsx`)
- Email and password login form
- "Forgot password?" link to forgot-password page
- "Sign up" link to register page
- Error handling and loading states
- Redirects to dashboard/onboarding on successful login

### 2. **Register Page** (`/apps/web/app/register/page.tsx`)
- Full name, email, and password registration form
- Password confirmation validation
- Minimum 6 character password requirement
- Links to login and forgot-password pages
- Redirects to login on successful registration

### 3. **Forgot Password Page** (`/apps/web/app/forgot-password/page.tsx`)
- Email input field
- Sends password reset email via `/api/auth/forgot-password`
- Success state showing confirmation message
- Rate limited by backend (`authLimiter`)
- Links back to login

### 4. **Reset Password Page** (`/apps/web/app/reset-password/page.tsx`)
- Handles Supabase token from email reset link
- Password and confirm password inputs
- Validates token validity
- Uses Supabase client-side SDK to:
  - Exchange code for session (`exchangeCodeForSession`)
  - Update user password (`updateUser`)
- Shows success/error states
- Redirects to login after successful reset

## Backend Implementation

### Forgot Password Endpoint
**Route:** `POST /api/auth/forgot-password`
- **Rate Limited:** Yes (via `authLimiter`)
- **Authentication:** Not required (public)
- **Parameters:**
  - `email` (string, required): User's email address
- **Response:**
  - Success: `{ status: "success", message: "..." }`
  - Error: `{ status: "error", message: "..." }`
- **Details:**
  - Uses Supabase's `resetPasswordForEmail` method
  - Redirects to `${webUrl}/reset-password` on email click
  - Sends password reset instructions to user

## Frontend Routes Updated

Updated `LayoutWrapper.tsx` to include new routes in `PUBLIC_ROUTES`:
```typescript
const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/onboarding"];
```

These routes are accessible without authentication.

## Authentication Context

The `AuthContext` in `/apps/web/app/context/AuthContext.tsx` provides:
- `login(email, password)`: Authenticates user
- `logout()`: Clears auth and redirects to login
- `restoreSession()`: Restores session from localStorage on mount
- Token refresh: Proactive refresh 60s before expiry

## User Flow

### Registration Flow
1. User navigates to `/register`
2. Enters full name, email, password
3. API creates Supabase auth user and profile
4. Redirects to `/login`
5. User logs in with email/password

### Forgot Password Flow
1. User at login page, clicks "Forgot password?"
2. Navigates to `/forgot-password`
3. Enters email address
4. Backend sends password reset email via Supabase
5. User clicks link in email (includes reset code)
6. Redirected to `/reset-password?code=...`
7. Page exchanges code for session and updates password
8. Redirects to `/login` on success

### Password Reset Flow
1. Email arrives with reset link: `${webUrl}/reset-password?code=...`
2. User clicks link
3. Page validates token via Supabase `exchangeCodeForSession`
4. User enters new password
5. Page calls `updateUser` with new password
6. Redirects to login page

## Environment Variables Required

### Frontend (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_API_URL=http://localhost:4000 (dev) or production URL
```

### Backend (`.env`)
```
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-supabase-service-key>
WEB_URL=http://localhost:3000 (dev) or production URL
```

## Supabase Configuration

### Email Configuration
Ensure Supabase email provider is configured:
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Email provider
3. Configure email templates (optional but recommended)
4. Enable "Confirm email" in user signup

### Reset Link Format
Supabase automatically includes the reset code in the email link:
- Template: `${WEB_URL}/reset-password?code=<recovery-token>`
- The code is exchanged for a session on the reset page

## Security Notes

1. **Rate Limiting:** Forgot password endpoint is rate limited
2. **Token Expiry:** Supabase tokens have built-in expiry (typically 1 hour)
3. **HTTPS Required:** In production, ensure all auth pages use HTTPS
4. **CSRF Protection:** Next.js provides automatic CSRF protection
5. **Password Requirements:** Minimum 6 characters (enforced on both frontend and backend)

## Testing Checklist

- [ ] Register new user
- [ ] Login with credentials
- [ ] Logout and redirect to login
- [ ] Click "Forgot password?" on login page
- [ ] Submit email for reset
- [ ] Check email for reset link
- [ ] Click reset link and verify token validation
- [ ] Enter new password and submit
- [ ] Login with new password
- [ ] Verify old password no longer works

## Future Enhancements

1. Add password strength meter on reset page
2. Add email verification on registration
3. Add two-factor authentication (2FA)
4. Add security questions as backup recovery method
5. Add account lockout after failed attempts
6. Add password history to prevent reuse
7. Add email change verification
