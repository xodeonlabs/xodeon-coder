import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NGCPreview } from '@/components/NGCPreview';
import { parseNGC } from '@/lib/ngc-parser';

const STORAGE_KEY = 'ngc_editor_code';

const Preview = () => {
  const navigate = useNavigate();
  const code = localStorage.getItem(STORAGE_KEY) || '';
  const { ast } = useMemo(() => parseNGC(code), [code]);

  return (
    <div className="flex flex-col h-screen w-screen" style={{ background: '#0f172a' }}>
      <div className="flex items-center justify-between px-4 h-10 shrink-0" style={{ background: '#0a0e1a', borderBottom: '1px solid #1e293b' }}>
        <span className="text-xs font-medium text-white">NGC Preview</span>
        <button
          onClick={() => navigate('/')}
          className="text-xs px-3 py-1 rounded"
          style={{ color: '#94a3b8', background: '#1e293b' }}
        >
          ← Terug naar editor
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <NGCPreview ast={ast} />
      </div>
    </div>
  );
};

export default Preview;
