import { useState, useEffect } from 'react';
import { getPageImageUrl } from '../api';
import './CitationsSection.css';

export default function CitationsSection({ citations = [] }) {
  if (!citations?.length) {
    return (
      <section className="section citations-section">
        <div className="citations-header">
          <h2>Artifacts/Citations</h2>
        </div>
        <p className="placeholder">No Artifacts available</p>
      </section>
    );
  }

  return (
    <section className="section citations-section">
      <div className="citations-header">
        <h2>Artifacts/Citations</h2>
        <span className="citations-count">{citations.length}</span>
      </div>
      <div className="citations-grid">
        {citations.map((c, i) => (
          <CitationCard key={i} citation={c} />
        ))}
      </div>
    </section>
  );
}

function CitationCard({ citation: c }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [imgError, setImgError] = useState(false);

  const showScreenshot = (c.type === 'text' || c.type === 'image') && c.doc_id && c.page;

  useEffect(() => {
    if (!showScreenshot || imgError) return;
    const url = getPageImageUrl(c.doc_id, c.page, c.bbox);
    setImgUrl(url);
  }, [showScreenshot, c.doc_id, c.page, c.bbox, imgError]);

  return (
    <article className={`citation-card citation-card--${c.type}`}>
      <div className="citation-card__header">
        <span className="citation-card__badge">{c.type}</span>
        {c.page && <span className="citation-card__page">Page {c.page}</span>}
      </div>

      {showScreenshot && imgUrl && (
        <div className="citation-card__screenshot">
          <img
            src={imgUrl}
            alt={`Cited chunk from page ${c.page}`}
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {c.type === 'text' && c.snippet && (
        <div className="citation-card__body">
          <p className="citation-card__snippet">{c.snippet}</p>
        </div>
      )}

      {c.type === 'image' && (
        <div className="citation-card__body">
          {c.snippet && <p className="citation-card__snippet">{c.snippet}</p>}
          {!imgUrl && !imgError && <p className="citation-card__snippet">[Loading chart/image from page {c.page}...]</p>}
          {imgError && <p className="citation-card__snippet">[Chart/Figure on page {c.page}]</p>}
        </div>
      )}

      {c.type === 'web' && (
        <div className="citation-card__body">
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="citation-card__link"
          >
            {c.title || c.url}
          </a>
          <p className="citation-card__snippet">{c.snippet}</p>
        </div>
      )}
    </article>
  );
}
