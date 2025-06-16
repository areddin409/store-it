import { Models } from 'node-appwrite';
import React from 'react';

const FileCard = ({ file }: { file: Models.Document }) => {
  return <div>{file.name}</div>;
};

export default FileCard;
