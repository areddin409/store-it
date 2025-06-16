import { cn, getFileIcon } from '@/lib/utils';
import Image from 'next/image';
import React from 'react';

const Thumbnail = ({
  type,
  extension,
  url = '',
  imageClassName,
  className,
}: ThumbnailProps) => {
  const isImage = type === 'image' && extension !== 'svg';
  return (
    <figure className={cn('thumbnail', className)}>
      {!isImage && (
        <div className="thumbnail-icon">
          <i className={getFileIcon(extension, type)} />
        </div>
      )}
      <Image
        src={isImage ? url : getFileIcon(extension, type)}
        alt="thumbnail"
        width={100}
        height={100}
        className={cn(
          'size-8 object-contain',
          imageClassName,
          isImage && 'thumbnail-image'
        )}
      />
    </figure>
  );
};

export default Thumbnail;
