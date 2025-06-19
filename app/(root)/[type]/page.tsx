import React from 'react';
import Sort from '@/components/file/Sort';
import { getFiles, getTotalSpaceUsed } from '@/lib/actions/file.actions';
import { Models } from 'node-appwrite';
import FileCard from '@/components/file/FileCard';
import { convertFileSize, getFileTypesParams } from '@/lib/utils';

const Page = async ({ searchParams, params }: SearchParamProps) => {
  const type = ((await params)?.type as string) || '';
  const searchText = ((await searchParams)?.query as string) || '';
  const sort = ((await searchParams)?.sort as string) || '';

  const types = getFileTypesParams(type) as FileType[];

  const files = await getFiles({ types, searchText, sort });

  const totalStorageUsed = await getTotalSpaceUsed();

  // Get storage size for current type (defaults to total used if not a specific type)
  const currentTypeStorage = (() => {
    if (type === 'images') return totalStorageUsed?.image?.size || 0;
    if (type === 'documents') return totalStorageUsed?.document?.size || 0;
    if (type === 'media') {
      // Media includes both video and audio
      return (
        (totalStorageUsed?.video?.size || 0) +
        (totalStorageUsed?.audio?.size || 0)
      );
    }
    if (type === 'others') return totalStorageUsed?.other?.size || 0;

    // Default to total used for dashboard or any other page
    return totalStorageUsed?.used || 0;
  })();

  // Format the size in MB with 2 decimal places
  const formattedSize = convertFileSize(currentTypeStorage, 2);

  return (
    <div className="page-container">
      <section className="w-full">
        <h1 className="h1 capitalize">{type}</h1>

        <div className="total-size-section">
          <p className="body-1">
            Total: <span className="h5">{formattedSize}</span>
          </p>

          <div className="sort-container">
            <p className="body-1 hidden text-light-200 sm:block">Sort by:</p>

            <Sort />
          </div>
        </div>
      </section>

      {/* Render the files */}
      {files.total > 0 ? (
        <section className="file-list">
          {files.documents.map((file: Models.Document) => (
            <FileCard key={file.$id} file={file} />
          ))}
        </section>
      ) : (
        <p className="empty-list">No files uploaded</p>
      )}
    </div>
  );
};

export default Page;
