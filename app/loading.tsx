import Loader from '@/components/common/Loader';
import React from 'react';

const Loading = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      {/* Loader component with custom styles */}
      <Loader
        size={64}
        useBranded={true}
        withBackground={true}
        className="p-4 rounded-lg bg-opacity-75 backdrop-blur-sm"
        showText={false}
      />
    </div>
  );
};

export default Loading;
