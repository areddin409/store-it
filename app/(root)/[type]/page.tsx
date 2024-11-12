import React from "react";
import { SearchParamProps } from "@/types";
import Sort from "@/components/Sort";
import { getFiles } from "@/lib/actions/file.actions";
import { Models } from "node-appwrite";
import FileCard from "@/components/FileCard";

const Page = async ({ params }: SearchParamProps) => {
  const type = ((await params)?.type as string) || "";

  const files = await getFiles();

  return (
    <div className={"page-container"}>
      <section className={"w-full"}>
        <h1 className={"h1 capitalize"}>{type}</h1>
        <div className="total-size-section">
          <p className="body-1">
            Total: <span className="h5">0 MB</span>
          </p>

          <div className="sort-container">
            <p className={"body-1 hidden text-light-200 sm:block"}>Sort by:</p>

            <Sort />
          </div>
        </div>
      </section>

      {/*  Render the files */}
      {files.total > 0 ? (
        <section className={"file-list"}>
          {files.documents.map((file: Models.Document) => (
            <FileCard key={file.$id} file={file} />
          ))}
        </section>
      ) : (
        <p className={"empty-list"}>No Files uploadd</p>
      )}
    </div>
  );
};
export default Page;
