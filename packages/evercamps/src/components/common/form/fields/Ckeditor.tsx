import Button from '@components/common/form/Button';
import { Input } from '@components/common/form/fields/Input';
import Spinner from '@components/common/Spinner';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  BlockQuote,
  Bold,
  ClassicEditor,
  CodeBlock,
  Essentials,
  Heading,
  Image,
  ImageBlock,
  ImageInline,
  ImageInsertViaUrl,
  ImageToolbar,
  Italic,
  Link,
  List,
  Paragraph,
  Table,
  TableToolbar,
  type Editor,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import React from 'react';
import './Ckeditor.scss';

const EDITOR_CONFIG = {
  plugins: [
    BlockQuote,
    Bold,
    CodeBlock,
    Essentials,
    Heading,
    Image,
    ImageBlock,
    ImageInline,
    ImageInsertViaUrl,
    ImageToolbar,
    Italic,
    Link,
    List,
    Paragraph,
    Table,
    TableToolbar,
  ],
  toolbar: [
    'heading',
    '|',
    'bold',
    'italic',
    'link',
    'bulletedList',
    'numberedList',
    'blockQuote',
    'insertTable',
    'codeBlock',
  ],
  image: {
    toolbar: ['imageTextAlternative'],
  },
  table: {
    contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
  },
};

interface FileItem {
  name: string;
  url: string;
  isSelected?: boolean;
}

interface Folder {
  name: string;
  index: number;
}

interface FileBrowserProps {
  editor: Editor;
  setFileBrowser: (open: boolean) => void;
  browserApi: string;
  deleteApi: string;
  uploadApi: string;
  folderCreateApi: string;
}

function File({ file, select }: { file: FileItem; select: (f: FileItem) => void }) {
  const className = file.isSelected === true ? 'selected' : '';
  return (
    <div className={`col image-item ${className}`}>
      <div className="inner">
        <a href="#" onClick={(e) => { e.preventDefault(); select(file); }}>
          <img src={file.url} alt="" />
        </a>
        {file.isSelected === true && (
          <div className="select fill-current text-primary">
            <svg style={{ width: '2rem' }} xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function FileBrowser({ editor, setFileBrowser, browserApi, deleteApi, uploadApi, folderCreateApi }: FileBrowserProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [folders, setFolders] = React.useState<string[]>([]);
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = React.useState<Folder[]>([]);
  const newFolderRefInput = React.useRef<HTMLInputElement>(null);

  const onSelectFolder = (e: React.MouseEvent, f: string) => {
    e.preventDefault();
    setCurrentPath(currentPath.concat({ name: f, index: currentPath.length + 1 }));
  };

  const onSelectFolderFromBreadcrumb = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setCurrentPath(currentPath.filter((f) => f.index <= index));
  };

  const onSelectFile = (f: FileItem) => {
    setFiles(files.map((file) => ({ ...file, isSelected: file.name === f.name })));
  };

  const close = (e: React.MouseEvent) => {
    e.preventDefault();
    setFileBrowser(false);
  };

  const createFolder = (e: React.MouseEvent, folder: string | undefined) => {
    e.preventDefault();
    if (!folder?.trim()) { setError('Invalid folder name'); return; }
    const path = [...currentPath.map((f) => f.name), folder.trim()];
    setLoading(true);
    fetch(folderCreateApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path.join('/') }),
      credentials: 'same-origin'
    })
      .then((res) => res.json())
      .then((response: { error?: { message: string } }) => {
        if (!response.error) {
          const recursiveFolders = folder.split('/');
          setFolders([...new Set(folders.concat(recursiveFolders[0]))]);
        } else {
          setError(response.error.message);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const deleteFile = () => {
    const file = files.find((f) => f.isSelected);
    if (!file) { setError('No file selected'); return; }
    const path = [...currentPath.map((f) => f.name), file.name];
    setLoading(true);
    fetch(deleteApi + path.join('/'), { method: 'DELETE' })
      .then((res) => res.json())
      .then((response: { error?: { message: string } }) => {
        if (!response.error) setCurrentPath([...currentPath]);
        else setError(response.error.message);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const insertFile = () => {
    const file = files.find((f) => f.isSelected);
    if (!file) { setError('No file selected'); return; }
    editor.execute('insertImageViaUrl', { imageURLs: [file.url] });
    setFileBrowser(false);
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formData = new FormData();
    const fileList = e.target.files;
    if (!fileList) return;
    for (let i = 0; i < fileList.length; i += 1) formData.append('images', fileList[i]);
    const path = currentPath.map((f) => f.name);
    setLoading(true);
    fetch(uploadApi + path.join('/'), { method: 'POST', body: formData })
      .then((res) => res.json())
      .then((response: { error?: { message: string } }) => {
        if (!response.error) setCurrentPath([...currentPath]);
        else setError(response.error.message);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    const path = currentPath.map((f) => f.name);
    setLoading(true);
    fetch(browserApi + path.join('/'), { method: 'GET' })
      .then((res) => res.json())
      .then((response: { error?: { message: string }; data?: { folders: string[]; files: FileItem[] } }) => {
        if (!response.error && response.data) {
          setFolders(response.data.folders);
          setFiles(response.data.files);
        } else {
          setError(response.error?.message ?? null);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentPath]);

  return (
    <div className="file-browser">
      {loading && (
        <div className="fixed top-0 left-0 bottom-0 right-0 flex justify-center">
          <Spinner width={30} height={30} />
        </div>
      )}
      <div className="content">
        <div className="flex justify-end">
          <a href="#" onClick={close} className="text-interactive fill-current">
            <svg style={{ width: '2rem' }} xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>
        <div>
          <div className="grid grid-cols-4 gap-8">
            <div className="col-span-1">
              <div className="current-path mb-16">
                <div className="flex">
                  <div className="pr-4">You are here:</div>
                  <div>
                    <a href="#" onClick={(e) => onSelectFolderFromBreadcrumb(e, 0)} className="text-interactive hover:underline">Root</a>
                  </div>
                  {currentPath.map((f) => (
                    <div key={f.index}>
                      <span>/</span>
                      <a className="text-interactive hover:underline" href="#" onClick={(e) => onSelectFolderFromBreadcrumb(e, f.index)}>{f.name}</a>
                    </div>
                  ))}
                </div>
              </div>
              <ul className="mt-6 mb-6">
                {folders.map((f, i) => (
                  <li key={i} className="text-interactive fill-current flex list-group-item">
                    <svg style={{ width: '2rem', height: '2rem' }} xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <a className="pl-2 hover:underline" href="#" onClick={(e) => onSelectFolder(e, f)}>{f}</a>
                  </li>
                ))}
                {folders.length === 0 && <li className="list-group-item"><span>There is no sub folder.</span></li>}
              </ul>
              <div className="justify-between">
                <Input placeholder="New folder" ref={newFolderRefInput} />
                <div className="mt-4">
                  <a href="#" onClick={(e) => createFolder(e, newFolderRefInput.current?.value)} className="text-interactive hover:underline">Create</a>
                </div>
              </div>
            </div>
            <div className="col-span-3">
              <div className="error text-critical mb-8">{error}</div>
              <div className="tool-bar grid grid-cols-3 gap-4 mb-8">
                <Button variant="critical" outline title="Delete image" onAction={deleteFile} />
                <Button variant="primary" title="Insert image" onAction={insertFile} />
                <Button title="Upload image" variant="secondary" onAction={() => document.getElementById('upload-image')?.click()} />
                <label htmlFor="upload-image" className="self-center" id="upload-image-label">
                  <a className="invisible">
                    <input id="upload-image" type="file" multiple onChange={onUpload} />
                  </a>
                </label>
              </div>
              {files.length === 0 && <div>There is no file to display.</div>}
              <div className="grid grid-cols-9 gap-4">
                {files.map((f) => <File file={f} select={onSelectFile} key={f.name} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CkeditorFieldProps {
  name: string;
  value: string;
  label?: string;
  browserApi: string;
  deleteApi: string;
  uploadApi: string;
  folderCreateApi: string;
}

export default function CkeditorField({
  name,
  value,
  label = '',
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
}: CkeditorFieldProps) {
  const [editorLoaded, setEditorLoaded] = React.useState(false);
  const [fileBrowser, setFileBrowser] = React.useState(false);
  const [editor, setEditor] = React.useState<Editor | null>(null);
  const [editorData, setEditorData] = React.useState(value);

  React.useEffect(() => {
    setEditorLoaded(true);
  }, []);

  return (
    <div className="ckeditor">
      <label htmlFor="description mt-4">{label}</label>
      <div className="image-icon mt-4">
        <a href="#" onClick={(e) => { e.preventDefault(); setFileBrowser(true); }}>
          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" className="hover:fill-primary">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </a>
      </div>
      <input type="hidden" name={name} value={editorData} />
      {editorLoaded && (
        <CKEditor
          editor={ClassicEditor as any}
          config={EDITOR_CONFIG}
          data={value}
          onReady={(ed) => setEditor(ed)}
          onChange={(_event, ed) => setEditorData(ed.getData())}
        />
      )}
      {fileBrowser && editor && (
        <FileBrowser
          editor={editor}
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
