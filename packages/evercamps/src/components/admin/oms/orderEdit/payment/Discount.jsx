import PropTypes from 'prop-types';
import React from 'react';


export function Discount({ discount = 0, code }) {
  return (
    <div className="summary-row">
      <span>Discount</span>
      <div>
        <div>{code}</div>
        <div>{discount}</div>
      </div>
    </div>
  );
}

Discount.propTypes = {
  code: PropTypes.string,
  discount: PropTypes.string
};
