import React from 'react';
import Image from 'next/image';

interface LoaderProps {
  size?: number;
  className?: string;
  text?: string;
  showText?: boolean;
  useBranded?: boolean;
  withBackground?: boolean;
}

const Loader = ({
  size = 24,
  className = '',
  text = 'Loading...',
  showText = true,
  useBranded = false,
  withBackground = false,
}: LoaderProps) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`flex flex-col items-center justify-center gap-2 ${withBackground ? 'bg-white dark:bg-gray-800 p-2 rounded-full shadow-md' : ''}`}
      >
        <Image
          src={
            useBranded
              ? '/assets/icons/loader-brand.svg'
              : '/assets/icons/loader.svg'
          }
          alt="Loading"
          width={size}
          height={size}
        />
        {showText && <p className="text-xs font-medium text-primary">{text}</p>}
      </div>
    </div>
  );
};

export default Loader;
