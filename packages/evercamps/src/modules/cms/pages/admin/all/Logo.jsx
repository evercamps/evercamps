import PropTypes from 'prop-types';
import React from 'react';

import './Logo.scss';

export default function Logo({
  themeConfig: {
    logo: { src, alt = 'EverCamps', width = '128px', height = '128px' }
  },
  homepageUrl
}) {
  return (
    <div className="logo">
      {src && (
        <a href={homepageUrl} className="flex items-end">
          <img src={src} alt={alt} width={width} height={height} />
        </a>
      )}
      {!src && (
        <a href={homepageUrl} className="flex items-end">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="254"
            height="292"
            fill="none"
            viewBox="0 0 254 292"
          >
            <defs>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#27BEA3" />
                <stop offset="100%" stopColor="#00546B" />
              </linearGradient>
            </defs>
            <path
              d="M200,50 C120,0 40,60 40,146 C40,228 120,290 200,240"
              fill="none"
              stroke="url(#blueGradient)"
              strokeWidth="48"
              strokeLinecap="round"
            />
            <line x1="170" y1="100" x2="200" y2="100" stroke="#27BEA3" strokeWidth="20" strokeLinecap="round" />
            <line x1="170" y1="145" x2="200" y2="145" stroke="#27BEA3" strokeWidth="20" strokeLinecap="round" />
            <line x1="170" y1="190" x2="200" y2="190" stroke="#00546B" strokeWidth="20" strokeLinecap="round" />
            <line x1="130" y1="100" x2="130" y2="190" stroke="#27BEA3" strokeWidth="20" strokeLinecap="round" />
          </svg>
          <span className="font-bold">EVERCAMPS</span>
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
  }),
  homepageUrl: PropTypes.string.isRequired
};

Logo.defaultProps = {
  themeConfig: {
    logo: {
      src: '',
      alt: 'EverCamps',
      width: '128',
      height: '128'
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
      }
    }
    homepageUrl: url(routeId:"homepage")
  }
`;
