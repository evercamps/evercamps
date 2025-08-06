import PropTypes from 'prop-types';
import React from 'react';

import './Logo.scss';

export default function Logo({
  themeConfig: {
    logo: { src, alt = 'EverCamps', width = '128px', height = '128px' }
  }
}) {
  return (
    <div className="logo md:ml-0 flex justify-center items-center">
      {src && (
        <a href="/" className="logo-icon">
          <img src={src} alt={alt} width={width} height={height} />
        </a>
      )}
      {!src && (
        <a href="/" className="logo-icon">
           <svg
            xmlns="http://www.w3.org/2000/svg"
            width="254"
            height="292"
            fill="none"
            viewBox="0 0 254 292"
          >
            <path
              d="M200,50 C120,0 40,60 40,146 C40,228 120,290 200,240"
              fill="none"
              stroke="#3a3a3a"
              stroke-width="48"
              stroke-linecap="round"
            />
            <line x1="170" y1="100" x2="200" y2="100" stroke="#3a3a3a" stroke-width="20" stroke-linecap="round" />
            <line x1="170" y1="145" x2="200" y2="145" stroke="#3a3a3a" stroke-width="20" stroke-linecap="round" />
            <line x1="170" y1="190" x2="200" y2="190" stroke="#3a3a3a" stroke-width="20" stroke-linecap="round" />
            <line x1="130" y1="100" x2="130" y2="190" stroke="#3a3a3a" stroke-width="20" stroke-linecap="round" />
          </svg>
        </a>
      )}
    </div>
  );
}

Logo.propTypes = {
  themeConfig: PropTypes.shape({
    logo: PropTypes.shape({
      src: PropTypes.string,
      alt: PropTypes.string,
      width: PropTypes.string,
      height: PropTypes.string
    })
  })
};

Logo.defaultProps = {
  themeConfig: {
    logo: {
      src: '',
      alt: 'EverCamps',
      width: '128',
      height: '146'
    }
  }
};

export const layout = {
  areaId: 'header',
  sortOrder: 10
};

export const query = `
  query query {
    themeConfig {
      logo {
        src
        alt
        width
        height
      }
    }
  }
`;
