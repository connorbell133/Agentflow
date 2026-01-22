# Clerk Webhook API Routes

Webhook handlers for Clerk authentication events.

## Route Structure
- webhook/ - Main webhook endpoint for Clerk events

## Webhook Events Handled
- `user.created` - New user registration
- `user.updated` - User profile changes
- `user.deleted` - User deletion
- `organization.created` - New organization setup
- `organization.updated` - Organization changes
- `organizationMembership.created` - User joined org
- `organizationMembership.deleted` - User left org

## Security Implementation
```typescript
import { Webhook } from 'svix';
import { headers } from 'next/headers';

// Verify webhook signature
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);
  
  try {
    const evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }
}
```

## Event Handlers
```typescript
// User created handler
async function handleUserCreated(data: UserCreatedEvent) {
  // Create profile in database
  await db.insert(profiles).values({
    id: data.id,
    email: data.email_addresses[0].email_address,
    firstName: data.first_name,
    lastName: data.last_name,
    imageUrl: data.image_url,
    created_at: new Date(data.created_at)
  });
  
  // Send welcome email
  await sendWelcomeEmail(data.email_addresses[0].email_address);
}

// Organization membership handler
async function handleOrgMembershipCreated(data: OrgMembershipEvent) {
  // Add user to organization
  await db.insert(organizationMembers).values({
    userId: data.public_user_data.user_id,
    org_id: data.organization.id,
    role: data.role,
    joinedAt: new Date()
  });
}
```

## Error Handling
```typescript
try {
  switch (evt.type) {
    case 'user.created':
      await handleUserCreated(evt.data);
      break;
    case 'user.updated':
      await handleUserUpdated(evt.data);
      break;
    // ... other cases
    default:
      console.warn(`Unhandled event type: ${evt.type}`);
  }
  
  return new Response('Webhook processed', { status: 200 });
} catch (error) {
  console.error('[Clerk Webhook Error]', error);
  
  // Return 200 to prevent retries for non-critical errors
  return new Response('Webhook error', { status: 200 });
}
```

## Database Sync
```typescript
// Keep local database in sync with Clerk
async function syncUserData(clerkUser: ClerkUser) {
  const existingUser = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, clerkUser.id))
    .limit(1);
    
  if (existingUser.length === 0) {
    // Create new user
    await createUserProfile(clerkUser);
  } else {
    // Update existing user
    await updateUserProfile(clerkUser);
  }
}
```

## Webhook Configuration
```bash
# Development (using localtunnel)
npm run tunnel
# Webhook URL: https://your-subdomain.loca.lt/api/clerk/webhook

# Production
# Webhook URL: https://your-domain.com/api/clerk/webhook
```

## Retry Logic
- Clerk retries failed webhooks automatically
- Return 200 status for handled errors
- Log errors for debugging
- Use idempotent operations

## Testing Webhooks
```bash
# Test webhook locally
npm run dev:webhook

# Trigger test events from Clerk dashboard
# Dashboard > Webhooks > Test

# Unit tests
npm test src/app/api/clerk/webhook
```

## Monitoring
```typescript
// Log webhook events
console.log('[Clerk Webhook]', {
  type: evt.type,
  userId: evt.data.id,
  timestamp: new Date().toISOString()
});

// Track metrics
await metrics.increment('webhook.clerk.processed', {
  event_type: evt.type
});
```

## Common Issues
- Signature verification failures - Check WEBHOOK_SECRET
- Missing user data - Ensure profile sync
- Duplicate events - Implement idempotency
- Race conditions - Use transactions

## Environment Variables
```env
CLERK_WEBHOOK_SECRET=whsec_xxxxx  # From Clerk dashboard
CLERK_API_KEY=sk_live_xxxxx       # For API calls
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
```

## Common Commands
```bash
npm run dev:webhook           # Development with tunnel
npm test webhook             # Test webhook handlers
npm run logs:webhook         # View webhook logs
```