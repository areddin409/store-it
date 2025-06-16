'use server';

import { createAdminClient } from '../appwrite';
import { InputFile } from 'node-appwrite/file';
import { appwriteConfig } from '../appwrite/config';
import { ID, Models, Query } from 'node-appwrite';
import { constructFileUrl, getFileType, parseStringify } from '../utils';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './user.actions';

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
 * Uploads a file to the storage bucket and creates a corresponding document in the database.
 *
 * @param {UploadFileProps} params - The parameters for uploading the file.
 * @param {File | Buffer} params.file - The file to be uploaded.
 * @param {string} params.ownerId - The ID of the user who owns the file.
 * @param {string} params.accountId - The account ID associated with the file.
 * @param {string} params.path - The path to revalidate after upload.
 * @returns {Promise<any>} The newly created file document, parsed and stringified.
 *
 * @throws Will throw an error if the file upload or document creation fails.
 *
 * @remarks
 * - If document creation fails after uploading the file, the uploaded file will be deleted from storage.
 * - The function also triggers a path revalidation after a successful upload.
 */
export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path,
}: UploadFileProps) => {
  const { databases, storage } = await createAdminClient();

  try {
    const inputFile = InputFile.fromBuffer(file, file.name);

    const bucketFile = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      inputFile
    );

    const fileDocument = {
      type: getFileType(bucketFile.name).type,
      name: bucketFile.name,
      url: constructFileUrl(bucketFile.$id),
      extension: getFileType(bucketFile.name).extension,
      size: bucketFile.sizeOriginal,
      owner: ownerId,
      accountId,
      users: [],
      bucketFileId: bucketFile.$id,
    };

    const newFile = await databases
      .createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        ID.unique(),
        fileDocument
      )
      .catch(async (error: unknown) => {
        await storage.deleteFile(appwriteConfig.bucketId, bucketFile.$id);
        handleError(error, 'Failed to create file document');
      });

    revalidatePath(path);

    return parseStringify(newFile);
  } catch (error) {
    handleError(error, 'Failed to upload file');
  }
};

/**
 * Creates database query parameters for retrieving user-specific files
 *
 * This helper function constructs the query parameters needed to fetch files
 * that are either owned by the current user or shared with them.
 *
 * @param currentUser - The document representing the currently authenticated user
 * @returns An array of Query objects to filter documents in the database
 *
 * @remarks
 * - The queries use an OR condition to match files where either:
 *   1. The current user is the owner (owner field equals user ID)
 *   2. The file is shared with the current user (users field contains user email)
 * - This function can be extended to add additional query parameters for
 *   searching, sorting, pagination, etc.
 */
const createQueries = (currentUser: Models.Document) => {
  const queries = [
    Query.or([
      Query.equal('owner', currentUser.$id),
      Query.contains('users', currentUser.email),
    ]),
  ];

  // TODO: search, sort, limits ...

  return queries;
};

/**
 * Retrieves all files accessible to the current user
 *
 * This function fetches files that are either owned by or shared with the
 * current authenticated user from the Appwrite database.
 *
 * @returns A promise that resolves to an array of file documents
 * @throws Will throw an error if fetching files fails or if no user is authenticated
 *
 * @remarks
 * - Uses the admin client to interact with the Appwrite database
 * - Verifies that a user is currently authenticated
 * - Applies query filters to only return files the user has access to
 * - Serializes the response to ensure it can be safely passed to client components
 *
 * @example
 * ```typescript
 * // In a server component or action
 * const files = await getFiles();
 * // Use files data...
 * ```
 */
export const getFiles = async () => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error('User not found.');
    }

    const queries = createQueries(currentUser);

    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      queries
    );

    return parseStringify(files);
  } catch (error) {
    handleError(error, 'Failed to get files');
  }
};
