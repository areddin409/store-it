'use server';

import { createAdminClient, createSessionClient } from '@/lib/appwrite';
import { InputFile } from 'node-appwrite/file';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Models, Query } from 'node-appwrite';
import { constructFileUrl, getFileType, parseStringify } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/user.actions';

/**
 * Error handler utility for file actions
 *
 * @param error - The error object caught in a try/catch block
 * @param message - A descriptive message about the operation that failed
 * @throws Always throws the original error after logging it
 */
const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

/**
 * Verifies the current user is the owner of a file
 *
 * @param fileId - The ID of the file to check ownership for
 * @param actionType - The type of action being performed (for error message)
 * @returns An object with { isOwner, currentUser, fileDoc, errorResponse }
 */
const verifyFileOwnership = async (fileId: string, actionType: string) => {
  const { databases } = await createAdminClient();

  // Get the current user
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      isOwner: false,
      currentUser: null,
      fileDoc: null,
      errorResponse: parseStringify({
        status: 'error',
        message: 'User not authenticated',
      }),
    };
  }

  // Fetch the file to check ownership
  try {
    const fileDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId
    );

    // Verify the current user is the owner of the file
    const isOwner = fileDoc.owner.$id === currentUser.$id;

    return {
      isOwner,
      currentUser,
      fileDoc,
      errorResponse: isOwner
        ? null
        : parseStringify({
            status: 'error',
            message: `Only the file owner can ${actionType} this file`,
          }),
    };
  } catch (error) {
    handleError(
      error,
      `Failed to verify ownership for ${actionType} operation`
    );
    return {
      isOwner: false,
      currentUser: null,
      fileDoc: null,
      errorResponse: null,
    };
  }
};

/**
 * Uploads a file to the Appwrite storage bucket and creates a document in the database
 *
 * This function handles the complete file upload process:
 * 1. Uploads the raw file to the Appwrite storage bucket
 * 2. Creates a document in the database with the file metadata
 * 3. Revalidates the path to update the UI
 *
 * @param file - The file buffer to upload
 * @param ownerId - The ID of the user who owns the file
 * @param accountId - The ID of the account associated with the file
 * @param path - The path to revalidate after upload
 * @returns The newly created file document or throws an error
 *
 * @throws Will throw an error if upload fails or document creation fails
 */
export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path,
}: UploadFileProps) => {
  const { storage, databases } = await createAdminClient();

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
 * Creates query parameters for filtering files based on user permissions and search criteria
 *
 * This helper function constructs the query parameters needed to fetch files
 * that are either owned by the current user or shared with them, with optional
 * filtering by file type, search text, and sorting.
 *
 * @param currentUser - The document representing the currently authenticated user
 * @param types - Array of file types to filter by (e.g., 'document', 'image')
 * @param searchText - Optional text to search for in file names
 * @param sort - Sorting parameter in format 'field-direction' (e.g., '$createdAt-desc')
 * @param limit - Optional maximum number of results to return
 * @returns An array of Query objects to filter documents in the database
 */
const createQueries = (
  currentUser: Models.Document,
  types: string[],
  searchText: string,
  sort: string,
  limit?: number
) => {
  const queries = [
    Query.or([
      Query.equal('owner', [currentUser.$id]),
      Query.contains('users', [currentUser.email]),
    ]),
  ];

  if (types.length > 0) queries.push(Query.equal('type', types));
  if (searchText) queries.push(Query.contains('name', searchText));
  if (limit) queries.push(Query.limit(limit));

  if (sort) {
    const [sortBy, orderBy] = sort.split('-');

    if (sortBy && orderBy) {
      queries.push(
        orderBy === 'asc' ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy)
      );
    }
  }

  return queries;
};

/**
 * Retrieves files accessible to the current user based on specified criteria
 *
 * This server action fetches files that are either owned by or shared with the
 * current authenticated user, with optional filtering by file type, search text,
 * and sorting preferences.
 *
 * @param types - Array of file types to filter by (e.g., 'document', 'image')
 * @param searchText - Optional text to search for in file names
 * @param sort - Sorting parameter in format 'field-direction' (e.g., '$createdAt-desc')
 * @param limit - Optional maximum number of results to return
 * @returns A promise that resolves to the list of matching file documents
 *
 * @throws Will throw an error if the user is not authenticated or if the database query fails
 */
export const getFiles = async ({
  types = [],
  searchText = '',
  sort,
  limit,
}: GetFilesProps) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) throw new Error('User not found');

    // Ensure sort has a default value if it's undefined or empty
    const sortValue = sort || '$createdAt-desc';

    const queries = createQueries(
      currentUser,
      types,
      searchText,
      sortValue,
      limit
    );

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

/**
 * Renames a file in the database
 *
 * This function checks if the current user is the owner of the file before allowing
 * the rename operation to proceed. Only file owners can rename files.
 *
 * @param fileId - The ID of the file document to rename
 * @param name - The new name provided by the user
 * @param extension - The original file extension
 * @param path - The path to revalidate after renaming
 * @returns The updated file document, error status object, or undefined if operation fails
 */
export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFileProps) => {
  const { databases } = await createAdminClient();

  try {
    // Verify ownership
    const { isOwner, errorResponse } = await verifyFileOwnership(
      fileId,
      'rename'
    );

    // Return error if not owner
    if (!isOwner) return errorResponse;

    // Check if the name already contains the extension
    const hasExtension = name
      .toLowerCase()
      .endsWith(`.${extension.toLowerCase()}`);

    // Only add the extension if it's not already there
    const newName = hasExtension ? name : `${name}.${extension}`;

    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {
        name: newName,
      }
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, 'Failed to rename file');
  }
};

/**
 * Updates the list of users who have access to a shared file
 *
 * This function checks if the current user is the owner of the file before allowing
 * the sharing operation to proceed. Only file owners can modify sharing permissions.
 *
 * @param fileId - The ID of the file document to update
 * @param emails - Array of email addresses that should have access to the file
 * @param path - The path to revalidate after updating sharing permissions
 * @returns The updated file document, error status object, or undefined if operation fails
 *
 * @throws Will throw an error if updating the file document fails
 */
export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  const { databases } = await createAdminClient();

  try {
    // Verify ownership
    const { isOwner, errorResponse } = await verifyFileOwnership(
      fileId,
      'update sharing permissions for'
    );

    // Return error if not owner
    if (!isOwner) return errorResponse;

    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {
        users: emails,
      }
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, 'Failed to update file sharing permissions');
  }
};

/**
 * Deletes a file from both the Appwrite storage bucket and the database
 *
 * This server action performs a two-step deletion process:
 * 1. Verifies the current user is the owner of the file
 * 2. Removes the file document from the database
 * 3. Deletes the actual file from the Appwrite storage bucket
 *
 * @param fileId - The ID of the file document to delete
 * @param bucketFileId - The ID of the file in the Appwrite storage bucket
 * @param path - The path to revalidate after deletion
 * @returns A success status object or undefined if operation fails
 *
 * @throws Will throw an error if the user is not the owner or if deletion fails
 */
export const deleteFile = async ({
  fileId,
  bucketFileId,
  path,
}: DeleteFileProps) => {
  const { databases, storage } = await createAdminClient();

  try {
    // Verify ownership
    const { isOwner, errorResponse } = await verifyFileOwnership(
      fileId,
      'delete'
    );

    // Return error if not owner
    if (!isOwner) return errorResponse;

    // Proceed with deletion from DB after verifying ownership
    const deletedFile = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId
    );

    if (deletedFile) {
      // Delete the file from the storage bucket
      await storage.deleteFile(appwriteConfig.bucketId, bucketFileId);
    }

    revalidatePath(path);
    return parseStringify({ status: 'success' });
  } catch (error) {
    handleError(error, 'Failed to delete file');
  }
};

/**
 * Calculates the total storage space used by the current user's files
 *
 * This server action computes storage statistics including:
 * - Total space used across all file types
 * - Space used by each file type (images, documents, videos, etc.)
 * - Latest modified date for each file type
 * - Available storage space (2GB bucket limit)
 *
 * @returns An object containing detailed storage usage statistics
 *   - Breakdown by file type (size and latest modified date)
 *   - Total space used across all files
 *   - Total available space (2GB)
 *
 * @throws Will throw an error if the user is not authenticated or if the storage calculation fails
 */
export async function getTotalSpaceUsed() {
  try {
    const { databases } = await createSessionClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('User is not authenticated.');

    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [Query.equal('owner', [currentUser.$id])]
    );

    const totalSpace = {
      image: { size: 0, latestDate: '' },
      document: { size: 0, latestDate: '' },
      video: { size: 0, latestDate: '' },
      audio: { size: 0, latestDate: '' },
      other: { size: 0, latestDate: '' },
      used: 0,
      all: 2 * 1024 * 1024 * 1024 /* 2GB available bucket storage */,
    };

    files.documents.forEach(file => {
      const fileType = file.type as FileType;
      totalSpace[fileType].size += file.size;
      totalSpace.used += file.size;

      if (
        !totalSpace[fileType].latestDate ||
        new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
      ) {
        totalSpace[fileType].latestDate = file.$updatedAt;
      }
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, 'Error calculating total space used:, ');
  }
}
