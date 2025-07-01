import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { Prisma } from '@prisma/client'

import { db } from '@/lib/db'
import { resetIngresses } from '@/actions/ingress'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
 
  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    return new Response('Webhook secret is not configured', {
      status: 500
    });
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing svix headers:', { svix_id, svix_timestamp, svix_signature });
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload);

  console.log('Received webhook payload:', payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    })
  }

  const eventType = evt.type;
  console.log('Processing webhook event:', eventType);
  console.log('User data:', {
    id: payload.data.id,
    username: payload.data.username,
    imageUrl: payload.data.image_url,
  });

  if (eventType === "user.created") {
    try {
      console.log('Creating user in database...');
      const userData = {
        externalUserId: payload.data.id,
        username: payload.data.username || `user_${payload.data.id}`,
        imageUrl: payload.data.image_url || 'https://placeholder.com/user.png',
        stream: {
          create: {
            name: `${payload.data.username || 'New User'}'s stream`,
          },
        },
      };
      console.log('User data to create:', userData);

      const user = await db.user.create({
        data: userData,
      });
      
      console.log('Successfully created user in database:', user);
      return new Response(JSON.stringify({ success: true, user }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error code:', error.code);
        console.error('Prisma error message:', error.message);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return new Response(JSON.stringify({ success: false, error: errorMessage }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  if (eventType === "user.updated") {
    try {
      console.log('Updating user in database...');
      const user = await db.user.update({
        where: {
          externalUserId: payload.data.id,
        },
        data: {
          username: payload.data.username,
          imageUrl: payload.data.image_url,
        },
      });
      console.log('Successfully updated user:', user);
      return new Response(JSON.stringify({ success: true, user }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return new Response(JSON.stringify({ success: false, error: errorMessage }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
 
  if (eventType === "user.deleted") {
    try {
      console.log('Deleting user from database...');
      await resetIngresses(payload.data.id);
      const user = await db.user.delete({
        where: {
          externalUserId: payload.data.id,
        },
      });
      console.log('Successfully deleted user:', user);
      return new Response(JSON.stringify({ success: true, user }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return new Response(JSON.stringify({ success: false, error: errorMessage }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
 
  return new Response('Webhook processed', { status: 200 });
};
