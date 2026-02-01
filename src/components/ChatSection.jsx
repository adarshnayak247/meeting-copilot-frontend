import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { queryRag } from '../api';
import './ChatSection.css';

export default function ChatSection({ selectedDocId, onCitations, latestSentence }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);
    setError(null);
    try {
      const res = await queryRag(userMsg, selectedDocId || null);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: res.answer, citations: res.citations },
      ]);
      onCitations?.(res.citations);
    } catch (e) {
      setError(e.message);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `Error: ${e.message}`, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle AI Answer - passes latest transcribed text to the API
  const handleAiAnswer = async () => {
    if (!latestSentence || loading) return;
    
    setMessages((m) => [...m, { role: 'user', content: latestSentence, source: 'voice' }]);
    setLoading(true);
    setError(null);
    
    try {
      const res = await queryRag(latestSentence, selectedDocId || null);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: res.answer, citations: res.citations },
      ]);
      onCitations?.(res.citations);
    } catch (e) {
      setError(e.message);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `Error: ${e.message}`, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section chat-section">
      {/* Chat Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="#cbd5e0">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
            </div>
            <p>Your interactions with JarWiz AI will start to appear here...</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <span className="message-role">
              {msg.role === 'user' ? (msg.source === 'voice' ? '🎤 You' : 'You') : 'RAG'}
            </span>
            <div className="message-content">
              {msg.role === 'assistant' && !msg.error ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <span className="message-role">RAG</span>
            <div className="message-content typing">Thinking…</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Buttons */}
      <div className="chat-actions">
        <button 
          type="button"
          onClick={handleAiAnswer}
          disabled={loading || !latestSentence}
          className="action-btn ai-answer-btn"
          title={latestSentence || 'No transcription available'}
        >
          AI Answer
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="chat-form">
        <div className="chat-input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask JarWiz for any session related query, answer, assistance ..."
            disabled={loading}
            className="chat-input"
          />
          <button type="submit" disabled={loading || !input.trim()} className="send-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
