import './CKEditor.scss';

interface CKEditorProps {
  content?: string;
}

export function CKEditor({ content = '' }: CKEditorProps) {
  return (
    <div className="ck-content">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
