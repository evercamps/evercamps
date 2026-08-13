import Dot from '@components/Dot';
import React from 'react';

interface ResourceLink {
  url?: string;
  name?: string;
}

interface NoResultProps {
  keyword?: string;
  resourseLinks?: ResourceLink[];
}

export function NoResult({ keyword = '', resourseLinks = [] }: NoResultProps) {
  return (
    <div className="no-result items-center text-center">
      <h3>
        No results for &quot;
        {keyword}
        &quot;
      </h3>
      <div>TRY OTHER RESOURCES</div>
      <div className="grid grid-cols-2 mt-4">
        {resourseLinks.map((link, index) => (
          <div
            key={index}
            className="flex space-x-4 justify-center items-center"
          >
            <Dot variant="info" />
            <a href={link.url} className="text-divider hover:underline">
              {link.name}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
