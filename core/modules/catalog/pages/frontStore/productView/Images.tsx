import ProductNoThumbnail from '@components/ProductNoThumbnail';
import React, { useEffect, useState } from 'react';

interface ProductImage {
  alt?: string;
  thumb?: string;
  single: string;
}

interface CurrentProps {
  image?: ProductImage | null;
}

function Current({ image = null }: CurrentProps) {
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const element = document.getElementById('product-current-image');

    if (element) {
      setHeight(element.offsetWidth);
    }
  }, []);

  return (
    <div
      id="product-current-image"
      style={{ minHeight: height, background: '#f6f6f6' }}
      className="product-image product-single-page-image flex justify-center items-center"
    >
      {image && (
        <img src={image.single} alt={image.alt} className="self-center" />
      )}
      {!image && <ProductNoThumbnail width={250} height={250} />}
    </div>
  );
}

interface ImagesProps {
  product: {
    uuid: string;
    image?: ProductImage | null;
    gallery?: ProductImage[];
  };
}

export default function Images({
  product: { uuid, image, gallery = [] }
}: ImagesProps) {
  const [current, setCurrent] = React.useState<ProductImage | null | undefined>(
    image
  );
  const [thumbs, setThumbs] = React.useState<ProductImage[]>(gallery);

  React.useEffect(() => {
    setCurrent(image);

    setThumbs(() => {
      const gls = [...gallery];

      if (image) {
        gls.unshift(image);
      }

      return gls;
    });
  }, [uuid]);

  return (
    <div className="product-single-media">
      <Current image={current} />

      <ul className="more-view-thumbnail product-gallery mt-8 grid grid-cols-4 gap-4">
        {thumbs.map((i, j) => (
          <li key={j} className="flex justify-center items-center">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrent({ ...i });
              }}
              className=""
            >
              <img className="self-center" src={i.thumb} alt={i.alt} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const layout = {
  areaId: 'productPageMiddleLeft',
  sortOrder: 10
};

export const query = `
  query Query {
    product (id: getContextValue('productId')) {
      uuid
      image {
        alt
        thumb
        single
      }
      gallery {
        alt
        thumb
        single
      }
    }
  }
`;