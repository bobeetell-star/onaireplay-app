import React from 'react';

const SkeletonCard: React.FC = () => {
  return (
    <div className="flex-shrink-0 w-48 animate-pulse">
      {/* Poster skeleton */}
      <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-gray-800">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-700 via-transparent to-transparent" />
        
        {/* Badge skeleton */}
        <div className="absolute top-2 right-2 w-12 h-5 bg-gray-700 rounded-full" />
        
        {/* Play count skeleton */}
        <div className="absolute bottom-2 left-2 flex items-center">
          <div className="w-3 h-3 bg-gray-700 rounded-full mr-1" />
          <div className="w-8 h-3 bg-gray-700 rounded" />
        </div>
      </div>
      
      {/* Title and info skeleton */}
      <div className="mt-3">
        <div className="w-full h-4 bg-gray-800 rounded mb-2" />
        <div className="w-3/4 h-4 bg-gray-800 rounded mb-1" />
        <div className="w-1/2 h-3 bg-gray-700 rounded" />
      </div>
    </div>
  );
};

export default SkeletonCard;