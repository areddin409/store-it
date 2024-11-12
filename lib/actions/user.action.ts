"use server";

import { Query, ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { bufferToBase64, parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { AVATAR_PLACEHOLDER_URL } from "@/constants";
import { redirect } from "next/navigation";

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("email", [email])],
  );

  return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const sendEmailOTP = async (email: string) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createEmailToken(ID.unique(), email);
    return session.userId;
  } catch (e) {
    handleError(e, "Failed to send email OTP");
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

  const accountId = await sendEmailOTP(email);
  if (!accountId) throw new Error("Failed to send email OTP");

  if (!existingUser) {
    const { databases, avatars } = await createAdminClient();

    const avatarBuffer = await avatars.getInitials();
    const avatar = bufferToBase64(avatarBuffer);

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar: avatar ?? AVATAR_PLACEHOLDER_URL,
        accountId,
      },
    );
  }

  return parseStringify({ accountId });
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

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify({ sessionId: session.$id });
  } catch (e) {
    handleError(e, "Failed to verify OTP");
  }
};

export const getCurrentUser = async () => {
  const { databases, account } = await createSessionClient();

  const result = await account.get();

  const user = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("accountId", result.$id)],
  );

  if (user.total <= 0) return null;

  return parseStringify(user.documents[0]);
};

export const signOUtUser = async () => {
  const { account } = await createSessionClient();
  try {
    await account.deleteSession("current");

    (await cookies()).delete("appwrite-session");
  } catch (e) {
    handleError(e, "Failed to sign out user");
  } finally {
    redirect("/sign-in");
  }
};

export const signInUser = async ({ email }: { email: string }) => {
  try {
    const existingUser = await getUserByEmail(email);

    if (!existingUser) {
      return parseStringify({ accountId: null, error: "User not found" });
    }

    await sendEmailOTP(email);
    return parseStringify({ accountId: existingUser.accountId });
  } catch (e) {
    handleError(e, `Failed to sign in user ${email}`);
  }
};
