import PropTypes from 'prop-types';
import React from 'react';

import './Items.scss';
import ProductNoThumbnail from '@components/ProductNoThumbnail';

function Items({ items = [], priceIncludingTax = false }) {
  return (
    <div id="summary-items">
      <table className="listing items-table">
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>
                <div className="product-thumbnail">
                  <div className="thumbnail">
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt={item.productName} />
                    )}
                    {!item.thumbnail && (
                      <ProductNoThumbnail width={45} height={45} />
                    )}
                  </div>
                  <span className="qty">{item.qty}</span>
                </div>
              </td>
              <td>
                <div className="product-column">
                  <div>
                    <span className="font-semibold">{item.productName}</span>
                  </div>
                  {item.variantTitle && (
                    <div className="text-textSubdued">{item.variantTitle}</div>
                  )}
                </div>
              </td>
              <td>
                <span>
                  {priceIncludingTax
                    ? item.lineTotalInclTax.text
                    : item.lineTotal.text}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Items.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      thumbnail: PropTypes.string,
      productName: PropTypes.string,
      qty: PropTypes.number,
      lineTotalInclTax: PropTypes.shape({
        text: PropTypes.string
      }),
      lineTotal: PropTypes.shape({
        text: PropTypes.string
      })
    })
  ),
  priceIncludingTax: PropTypes.bool
};

export { Items };
