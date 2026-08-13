/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import Spinner from '@components/Spinner';
import PropTypes from 'prop-types';
import React from 'react';
import uniqid from 'uniqid';
import { toast } from 'react-toastify';
import { get } from '../../../../../lib/util/get.js';
import './ProductMediaManager.scss';

interface ProductImage {
  id: string;
  url: string;
  path?: string;
}

interface UploadProps {
  addImage: (images: ProductImage[]) => void;
  productImageUploadUrl: string;
}

function Upload({ addImage, productImageUploadUrl }: UploadProps) {
  const [uploading, setUploading] = React.useState(false);

  const onChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    if (!e.target.files) return;

    setUploading(true);

    const formData = new FormData();

    Array.from(e.target.files).forEach((file) => {
      formData.append('images', file);
    });

    const targetPath = `catalog/${
      Math.floor(Math.random() * (9999 - 1000)) + 1000
    }/${Math.floor(Math.random() * (9999 - 1000)) + 1000}`;

    formData.append('targetPath', targetPath);

    try {
      const response = await fetch(productImageUploadUrl + targetPath, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (
        !response.headers.get('content-type') ||
        !response.headers.get('content-type')!.includes('application/json')
      ) {
        throw new TypeError('Something wrong. Please try again');
      }

      const json = await response.json();

      if (!json.error) {
        addImage(
          get(json, 'data.files', []).map((i: { url: string; path: string }) => ({
            id: uniqid(),
            url: i.url,
            path: i.path
          }))
        );
      } else {
        toast.error(String(get(json, 'error.message', 'Failed!')));
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      e.target.value = '';
      setUploading(false);
    }
  };

  const id = uniqid();

  return (
    <div className="uploader grid-item">
      <div className="uploader-icon">
        <label htmlFor={id}>
          {uploading ? (
            <Spinner width={25} height={25} />
          ) : (
            <svg
              style={{ width: '30px', height: '30px' }}
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </label>
      </div>

      <div className="invisible">
        <input id={id} type="file" multiple onChange={onChange} />
      </div>
    </div>
  );
}

interface ImageProps {
  image: ProductImage;
  removeImage: (id: string) => void;
}

function Image({ image, removeImage }: ImageProps) {
  return (
    <div className="image grid-item" id={image.id}>
      <div className="img">
        <img src={image.url} alt="" />
      </div>

      <span
        className="remove cursor-pointer text-critical fill-current"
        onClick={() => removeImage(image.id)}
      >
        🗑
      </span>
    </div>
  );
}

interface ImagesProps {
  id: string;
  images: ProductImage[];
  addImage: (images: ProductImage[]) => void;
  removeImage: (id: string) => void;
  productImageUploadUrl: string;
}

function Images({
  id,
  images,
  addImage,
  removeImage,
  productImageUploadUrl
}: ImagesProps) {
  return (
    <div id={id} className="image-list">
      {images.map((image) => (
        <Image
          key={image.id}
          image={image}
          removeImage={removeImage}
        />
      ))}

      <Upload
        addImage={addImage}
        productImageUploadUrl={productImageUploadUrl}
      />
    </div>
  );
}

async function loadSwappable() {
  const { Swappable } = await import('@shopify/draggable');
  return Swappable;
}

interface ProductMediaManagerProps {
  productImages?: ProductImage[];
  id: string;
  productImageUploadUrl: string;
}

export default function ProductMediaManager({
  productImages = [],
  id,
  productImageUploadUrl
}: ProductMediaManagerProps) {
  const [images, setImages] = React.useState<ProductImage[]>(productImages);
  const [draggable, setDraggable] = React.useState<any>(null);

  React.useEffect(() => {
    async function initSwappable() {
      if (draggable) {
        draggable.destroy();
      }

      const Swappable = await loadSwappable();

      const swappable = new Swappable(
        document.querySelectorAll(`div#${id}`),
        {
          draggable: 'div.image',
          handle: 'div.image img'
        }
      );

      let source: string | null = null;
      let destination: string | null = null;

      swappable.on('swappable:swapped', (event: any) => {
        source = event.data.dragEvent.data.source.id;
        destination = event.data.dragEvent.data.over.id;
      });

      swappable.on('swappable:stop', () => {
        if (!source || !destination) return;

        setImages((originImages) => {
          const newImages = [...originImages];

          const sourceIndex = originImages.findIndex(
            (image) => image.id === source
          );
          const destinationIndex = originImages.findIndex(
            (image) => image.id === destination
          );

          [newImages[sourceIndex], newImages[destinationIndex]] = [
            newImages[destinationIndex],
            newImages[sourceIndex]
          ];

          return newImages;
        });
      });

      setDraggable(swappable);
    }

    initSwappable();
  }, [id]);

  const addImage = (imageArray: ProductImage[]) => {
    draggable?.destroy();
    setImages((current) => [...current, ...imageArray]);
  };

  const removeImage = (imageId: string) => {
    draggable?.destroy();
    setImages((current) =>
      current.filter((image) => image.id !== imageId)
    );
  };

  return (
    <div className="product-image-manager">
      <Images
        id={id}
        images={images}
        addImage={addImage}
        removeImage={removeImage}
        productImageUploadUrl={productImageUploadUrl}
      />

      {images.map((image) => (
        <input
          key={image.id}
          type="hidden"
          name={`${id}[]`}
          value={image.url}
        />
      ))}
    </div>
  );
}