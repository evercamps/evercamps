import PropTypes from 'prop-types';
import React from 'react';


function ProductNoThumbnail({ width, height }) {
  return (
    <svg
      width={width || 100}
      height={height || 100}
      viewBox="0 0 251 292"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M200,50 C120,0 40,60 40,146 C40,228 120,290 200,240"
        fill="none"
        stroke="#BBBBBB"
        strokeWidth="48"
        strokeLinecap="round"
      />
      <line x1="170" y1="100" x2="200" y2="100" stroke="#BBBBBB" strokeWidth="20" strokeLinecap="round" />
      <line x1="170" y1="145" x2="200" y2="145" stroke="#BBBBBB" strokeWidth="20" strokeLinecap="round" />
      <line x1="170" y1="190" x2="200" y2="190" stroke="#BBBBBB" strokeWidth="20" strokeLinecap="round" />
      <line x1="130" y1="100" x2="130" y2="190" stroke="#BBBBBB" strokeWidth="20" strokeLinecap="round" />
    </svg>
  );
}

ProductNoThumbnail.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number
};

ProductNoThumbnail.defaultProps = {
  width: 100,
  height: 100
};

export default ProductNoThumbnail;
