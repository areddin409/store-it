'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '../appwrite';
import { appwriteConfig } from '../appwrite/config';
import { parseStringify } from '../utils';
import { cookies } from 'next/headers';

/**
 * **Create account flow**
 * 1. User enters full name and email
 * 2. check if the user already exists using the email (we will use this to identify if we stil lneed to create a user document or not)
 * 3. Send OTP to the user's email
 * 4. This will send a secret key for creating a session.
 * 5. create a new user document if the user is a new user
 * 6. Return user's accountId that wil be used to complete the logic
 * 7. Verify the OTP and authenticate to login
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

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createEmailToken(ID.unique(), email);

    return session.userId;
  } catch (error) {
    handleError(error, 'Failed to send email OTP');
  }
};

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
        avatar:
          'https://villagesonmacarthur.com/wp-content/uploads/2020/12/Blank-Avatar.png',

        accountId,
      }
    );
  }

  return parseStringify({
    accountId,
  });
};

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
