import { useState } from 'react';
import PdfUploadSection from './components/PdfUploadSection';
import ChatSection from './components/ChatSection';
import CitationsSection from './components/CitationsSection';
import MeetTranscriptionSection from './components/MeetTranscriptionSection';
import './App.css';

function App() {
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [citations, setCitations] = useState([]);
  const [latestSentence, setLatestSentence] = useState('');

  return (
    <div className="app">
      <main className="main-layout">
        {/* Left Panel: Meet + Transcript + Doc Upload */}
        <div className="left-panel">
          <MeetTranscriptionSection onLatestSentence={setLatestSentence} />
          
          {/* Compact Doc Upload Section */}
          <div className="doc-upload-compact">
            <PdfUploadSection
              onDocSelect={setSelectedDocId}
              selectedDocId={selectedDocId}
              compact={true}
            />
          </div>
        </div>
        
        {/* Middle Panel: Chat */}
        <div className="middle-panel">
          <ChatSection
            selectedDocId={selectedDocId}
            onCitations={setCitations}
            latestSentence={latestSentence}
          />
        </div>
        
        {/* Right Panel: Citations */}
        <div className="right-panel">
          <CitationsSection citations={citations} />
        </div>
      </main>
    </div>
  );
}

export default App;
