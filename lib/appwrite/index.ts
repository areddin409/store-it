'use server';

/**
 * Appwrite client utilities for StoreIt application
 *
 * This module provides functions to create authenticated Appwrite clients for both user sessions
 * and administrative operations. These clients enable interaction with Appwrite's backend services
 * while maintaining proper authentication contexts.
 *
 * @module appwrite/index
 */

import { Account, Avatars, Client, Databases, Storage } from 'node-appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Creates and configures an Appwrite client instance using the current user's session.
 *
 * This function initializes an Appwrite `Client` with the endpoint and project ID from the configuration,
 * then retrieves the user's session token from cookies and sets it on the client. It returns an object
 * exposing the `Account` and `Databases` services, both authenticated as the current user.
 *
 * @throws {Error} If no session token is found in the cookies.
 *
 * @remarks
 * - **Session Client**: This client is authenticated as the currently logged-in user, using their session token.
 *   It should be used for operations that require user context, such as accessing or modifying resources
 *   that belong to the authenticated user, or performing actions on behalf of the user.
 *
 * - **Usage Context**: This client is designed to be used in server components or server actions where
 *   the Next.js cookies API is available. It cannot be used directly in client components.
 *
 * - **Admin Client**: In contrast, an admin client is typically authenticated using an API key or JWT with
 *   elevated privileges. It is used for administrative tasks that require broader access, such as managing
 *   users, accessing all data, or performing actions not limited to a single user's permissions.
 *
 * @example
 * ```typescript
 * const sessionClient = await createSessionClient();
 * const userAccount = await sessionClient.account.get();
 * ```
 *
 * @see {@link https://appwrite.io/docs/sdks} for more details on Appwrite client SDKs.
 * @see {@link createAdminClient} for administrative operations.
 * @returns An object containing authenticated Appwrite services (account, databases)
 */
export const createSessionClient = async () => {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId);

  const session = (await cookies()).get('appwrite_session');

  if (!session || !session.value) {
    redirect('/sign-in'); // Redirect to sign-in if no session is found
  }

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
};

/**
 * Creates and configures an Appwrite client instance with administrative privileges.
 *
 * This function initializes an Appwrite `Client` with the endpoint and project ID from the configuration,
 * and authenticates it using the secret API key. It returns an object exposing multiple Appwrite services
 * (Account, Databases, Storage, and Avatars), all authenticated with administrative privileges.
 *
 * @throws {Error} If the secret key is not properly configured.
 *
 * @remarks
 * - **Admin Client**: This client is authenticated using a secret API key with elevated privileges.
 *   It should be used for administrative operations that require broader access than a regular user,
 *   such as managing users, accessing all data regardless of permissions, or performing system-level actions.
 *
 * - **Security Warning**: The admin client has powerful capabilities. Be careful about where and how
 *   this client is used. It should NEVER be exposed to the client-side and should only be used in
 *   server-side contexts (e.g., in API routes, server components, or server actions).
 *
 * @example
 * ```typescript
 * const adminClient = await createAdminClient();
 * const allUsers = await adminClient.account.listUsers();
 * ```
 *
 * @see {@link https://appwrite.io/docs/advanced/platform/api-keys} for more details on Appwrite API keys.
 * @see {@link createSessionClient} for client-side user authentication.
 */
export const createAdminClient = async () => {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.secretKey);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },
    get avatars() {
      return new Avatars(client);
    },
  };
};
