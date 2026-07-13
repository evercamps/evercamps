import PropTypes from 'prop-types';
import React from 'react';

export default function CopyRight({ themeConfig: { copyRight } } = {
  themeConfig: {
    copyRight: '© 2026 EverCamps. All Rights Reserved.'
  }
}) {
  return (
    <div className="copyright">
      <span>{copyRight}</span>
    </div>
  );
}

CopyRight.propTypes = {
  themeConfig: PropTypes.shape({
    copyRight: PropTypes.string.isRequired
  })
};

export const layout = {
  areaId: 'footerLeft',
  sortOrder: 10
};

export const query = `
  query query {
    themeConfig {
      copyRight
    }
  }
`;
