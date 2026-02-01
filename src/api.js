/**
 * API client for JarWiz AI backend
 * @module api
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Upload a PDF file for processing and indexing
 * @param {File} file - The PDF file to upload
 * @returns {Promise<{success: boolean, doc_id: string, message: string}>}
 */
export async function uploadPdf(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload_pdf`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

/**
 * Query the RAG system with a question
 * @param {string} query - The question to ask
 * @param {string|null} docId - Optional document ID to filter results
 * @param {number} topK - Number of results to return (default: 5)
 * @returns {Promise<{answer: string, citations: Array}>}
 */
export async function queryRag(query, docId = null, topK = 5) {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, doc_id: docId, top_k: topK }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Query failed');
  }
  return res.json();
}

/**
 * List all uploaded documents
 * @returns {Promise<Array<{doc_id: string, filename: string, page_count: number}>>}
 */
export async function listDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to list documents');
  return res.json();
}

/**
 * Get the URL for a document page image
 * @param {string} docId - Document ID
 * @param {number} page - Page number
 * @param {Object|null} bbox - Optional bounding box for cropping
 * @returns {string} URL to the page image
 */
export function getPageImageUrl(docId, page, bbox = null) {
  let url = `${API_BASE}/documents/${docId}/page/${page}`;
  if (bbox && bbox.x0 != null && bbox.y0 != null && bbox.x1 != null && bbox.y1 != null) {
    url += `?x0=${bbox.x0}&y0=${bbox.y0}&x1=${bbox.x1}&y1=${bbox.y1}`;
  }
  return url;
}

