import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { syncProfileFromClerk } from '@/actions/auth/profile-sync';
import { createLogger } from '@/lib/infrastructure/logger';

const logger = createLogger('clerk-webhook');

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  console.log('🔔 Clerk webhook received');

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Missing svix headers');
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.text();
  const body = JSON.parse(payload);

  // Require webhook secret - NO FALLBACK
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ CLERK_WEBHOOK_SECRET not configured');
    return new Response('Server configuration error', { status: 500 });
  }

  // Create a new Svix instance with your secret
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('❌ Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log(`📝 Processing event: ${eventType}`);

  // Use admin client for webhook operations (bypasses RLS)
  const supabase = getSupabaseAdminClient();

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    try {
      logger.info('Processing user.created webhook', { userId: id });

      // Use enhanced sync function with retry logic
      const result = await syncProfileFromClerk(id, {
        email: email_addresses[0]?.email_address || '',
        firstName: first_name,
        lastName: last_name,
        imageUrl: image_url,
      });

      if (result.success) {
        logger.info('User profile sync successful', {
          userId: id,
          created: result.created,
        });
      } else {
        logger.error('User profile sync failed', {
          userId: id,
          error: result.error,
        });
        // Return 200 to prevent webhook retries, but log the error
        // The ProfileCompletionProvider will catch this on user login
      }

      console.log(`✅ User profile created for ${id}`);
    } catch (error) {
      console.error('❌ Error handling user.created webhook:', error);
      logger.error('Unexpected error in user.created webhook', { error });
      // Return 200 to prevent webhook retries
      // The ProfileCompletionProvider will handle missing profiles
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    try {
      // Update user profile in our database using Supabase admin client
      const { error } = await supabase
        .from('profiles')
        .update({
          email: email_addresses[0]?.email_address || '',
          full_name: `${first_name || ''} ${last_name || ''}`.trim(),
          avatar_url: image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error updating profile:', error);
        return new Response('Internal Server Error', { status: 500 });
      }

      console.log(`✅ User profile updated for ${id}`);
    } catch (error) {
      console.error('❌ Error handling user.updated webhook:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    try {
      // Delete user profile from our database using Supabase admin client
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id as string);

      if (error) {
        console.error('❌ Error deleting profile:', error);
        return new Response('Internal Server Error', { status: 500 });
      }

      console.log(`✅ User profile deleted for ${id}`);
    } catch (error) {
      console.error('❌ Error handling user.deleted webhook:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  return new Response('', { status: 200 });
}
