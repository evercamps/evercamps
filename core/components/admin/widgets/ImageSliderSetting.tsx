import { Field } from '@components/form/Field';
import FileBrowser from '@components/form/fields/editor/FileBrowser';
import React from 'react';
import type { ImageSlide, ImageSliderWidget } from '../../../modules/cms/types/index.js';

interface ImageSliderSettingProps {
  imageSliderWidget?: ImageSliderWidget | null;
  browserApi: string;
  deleteApi: string;
  uploadApi: string;
  folderCreateApi: string;
}

function move(list: ImageSlide[], from: number, to: number): ImageSlide[] {
  if (to < 0 || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function ImageSliderSetting({
  imageSliderWidget,
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
}: ImageSliderSettingProps) {
  const { slides = [], interval = 5, className = '' } = imageSliderWidget || {};
  const [items, setItems] = React.useState<ImageSlide[]>(
    slides.map((s) => ({ url: s.url || '', alt: s.alt || '', link: s.link || '' }))
  );
  const [fileBrowser, setFileBrowser] = React.useState(false);

  const update = (index: number, key: keyof ImageSlide, value: string) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const onLink =
    (action: () => void) =>
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      action();
    };

  return (
    <div>
      <div className="mb-4">
        {items.length === 0 && <p className="mb-4">No images yet.</p>}
        {items.map((item, index) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="flex gap-4 items-start border-b border-divider py-4"
          >
            <img src={item.url} alt="" style={{ width: '12rem', height: 'auto' }} />
            <div className="flex-grow grid grid-cols-1 gap-2">
              <input
                className="form-field"
                type="text"
                placeholder="Alternative text (describes the image)"
                value={item.alt}
                onChange={(e) => update(index, 'alt', e.target.value)}
              />
              <input
                className="form-field"
                type="text"
                placeholder="Link (optional), e.g. /surfkampen"
                value={item.link}
                onChange={(e) => update(index, 'link', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <a href="#" className="text-interactive" onClick={onLink(() => setItems(move(items, index, index - 1)))}>
                Up
              </a>
              <a href="#" className="text-interactive" onClick={onLink(() => setItems(move(items, index, index + 1)))}>
                Down
              </a>
              <a href="#" className="text-critical" onClick={onLink(() => setItems(items.filter((_, i) => i !== index)))}>
                Remove
              </a>
            </div>
          </div>
        ))}
        <a href="#" className="text-interactive" onClick={onLink(() => setFileBrowser(true))}>
          + Add image
        </a>
      </div>
      <Field type="hidden" name="settings[slides]" value={JSON.stringify(items)} />
      <Field
        type="text"
        name="settings[interval]"
        label="Seconds per image (0 = no autoplay)"
        value={String(interval ?? 5)}
        validationRules={['number']}
      />
      <Field
        type="text"
        name="settings[className]"
        label="Custom css classes"
        value={className}
        placeholder="Custom css classes"
      />
      {fileBrowser && (
        <FileBrowser
          onInsert={(url: string) => {
            setItems([...items, { url, alt: '', link: '' }]);
            setFileBrowser(false);
          }}
          isMultiple={false}
          setFileBrowser={setFileBrowser}
          browserApi={browserApi}
          deleteApi={deleteApi}
          uploadApi={uploadApi}
          folderCreateApi={folderCreateApi}
        />
      )}
    </div>
  );
}

export const query = `
  query Query($settings: JSON) {
    imageSliderWidget(settings: $settings) {
      slides {
        url
        alt
        link
      }
      interval
      className
    }
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    uploadApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "folderCreate")
  }
`;

export const variables = `{
  settings: getWidgetSetting()
}`;
