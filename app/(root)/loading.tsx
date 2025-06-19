import React from 'react';
import Loader from '@/components/common/Loader';

const LoadingPage = () => {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader
        size={64}
        useBranded={true}
        withBackground={true}
        className="p-4 rounded-lg bg-opacity-75 backdrop-blur-sm"
        // text="Loading content..."
        showText={false}
      />
    </div>
  );
};

export default LoadingPage;
