'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient, createSessionClient } from '../appwrite';
import { appwriteConfig } from '../appwrite/config';
import { parseStringify } from '../utils';
import { cookies } from 'next/headers';
import { avatarPlaceholderUrl } from '@/constants';

/**
 * User Authentication Server Actions
 *
 * This module provides server-side functions for handling user authentication
 * using Appwrite services and Next.js server actions.
 *
 * @module lib/actions/user.actions
 *
 * **Create account/authentication flow**
 * 1. User enters full name and email
 * 2. Check if the user already exists using the email
 *    (this determines if we need to create a user document)
 * 3. Send OTP to the user's email
 * 4. Store the accountId for later verification
 * 5. Create a new user document if the user is new
 * 6. Return user's accountId for OTP verification
 * 7. Verify the OTP and create an authenticated session
 */

/**
 * Retrieves a user document from the database by email address
 *
 * @param email - The email address to search for
 * @returns The user document if found, or null if no user exists with the given email
 * @throws Will throw an error if the database query fails
 */
const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal('email', [email])]
  );

  return result.total > 0 ? result.documents[0] : null;
};

/**
 * Handles errors by logging them and re-throwing them
 *
 * @param error - The error object that was caught
 * @param message - A descriptive message about what operation failed
 * @throws Always throws the original error after logging it
 */
const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

/**
 * Sends a one-time password (OTP) to the specified email address
 *
 * This function creates an email token through Appwrite's account service,
 * which sends an email with a verification code to the user.
 *
 * @param email - The email address to send the OTP to
 * @returns The userId generated for the email token, used later for verification
 * @throws Will throw an error if sending the email fails
 */
export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createEmailToken(ID.unique(), email);

    return session.userId;
  } catch (error) {
    handleError(error, 'Failed to send email OTP');
  }
};

/**
 * Creates a new account or initiates login for an existing account
 *
 * This function:
 * 1. Checks if a user with the given email already exists
 * 2. Sends an OTP to the email address
 * 3. If the user is new, creates a document in the users collection
 * 4. Returns the accountId that will be used for OTP verification
 *
 * @param fullName - The user's full name (required for new accounts)
 * @param email - The user's email address
 * @returns An object containing the accountId for OTP verification
 * @throws Will throw an error if OTP sending fails or document creation fails
 */
export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({
    email,
  });

  if (!accountId) {
    throw new Error('Failed to send email OTP');
  }

  if (!existingUser) {
    const { databases } = await createAdminClient();

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,

        accountId,
      }
    );
  }

  return parseStringify({
    accountId,
  });
};

/**
 * Verifies the OTP (secret/password) entered by the user and creates a session
 *
 * This function:
 * 1. Creates an Appwrite session using the accountId and OTP password
 * 2. Sets a secure HTTP-only cookie containing the session token
 * 3. Returns the session ID for client-side reference
 *
 * @param accountId - The accountId returned from createAccount or sendEmailOTP
 * @param password - The OTP password that the user received via email
 * @returns An object containing the sessionId if verification is successful
 * @throws Will throw an error if verification fails or session creation fails
 */
export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    const { account } = await createAdminClient();

    const session = await account.createSession(accountId, password);

    (await cookies()).set('appwrite_session', session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
    });

    return parseStringify({
      sessionId: session.$id,
    });
  } catch (error) {
    handleError(error, 'Failed to verify OTP');
  }
};

/**
 * Retrieves the currently authenticated user's information
 *
 * This function:
 * 1. Creates a session client using the stored cookie
 * 2. Gets the account details from Appwrite
 * 3. Retrieves the associated user document from the database
 * 4. Returns the user document or null if not found
 *
 * @returns The current user's document if authenticated, null otherwise
 * @throws Will throw an error if the session is invalid or database query fails
 */
export const getCurrentUser = async () => {
  const { account, databases } = await createSessionClient();

  const result = await account.get();

  const user = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal('accountId', [result.$id])]
  );

  if (user.total <= 0) {
    return null;
  }

  return parseStringify(user.documents[0]);
};
