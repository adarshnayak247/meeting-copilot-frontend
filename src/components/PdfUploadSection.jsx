import { useState, useCallback, useEffect } from 'react';
import { uploadPdf, listDocuments } from '../api';
import './PdfUploadSection.css';

export default function PdfUploadSection({ onDocSelect, selectedDocId }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const list = await listDocuments();
      setDocs(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadPdf(file);
      await loadDocs();
      onDocSelect?.(res.doc_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f?.type === 'application/pdf') setFile(f);
  };

  const handleDragOver = (e) => e.preventDefault();

  return (
    <section className="section pdf-upload-section">
      <h2>📄 Upload PDF</h2>
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          id="pdf-input"
          className="file-input"
        />
        <label htmlFor="pdf-input" className="drop-label">
          {file ? file.name : 'Drop PDF or click to browse'}
        </label>
      </div>
      <button
        className="btn btn-primary"
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? 'Uploading…' : 'Upload'}
      </button>
      {error && <p className="error">{error}</p>}
      <div className="doc-list">
        <button className="btn btn-secondary" onClick={loadDocs} disabled={loadingDocs}>
          {loadingDocs ? 'Loading…' : 'Refresh documents'}
        </button>
        <ul>
          {docs.map((d) => (
            <li
              key={d.doc_id}
              className={selectedDocId === d.doc_id ? 'selected' : ''}
              onClick={() => onDocSelect?.(d.doc_id)}
            >
              {d.filename} <span className="meta">({d.chunk_count} chunks)</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
