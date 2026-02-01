import { useState, useRef, useEffect } from 'react';
import './MeetTranscriptionSection.css';

// Deepgram Configuration
const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;
const DEEPGRAM_URL = 'wss://api.deepgram.com/v1/listen';
const DEEPGRAM_PARAMS = {
  model: 'nova-2',
  language: 'en',
  smart_format: 'true',
  punctuate: 'true',
  diarize: 'true',
  interim_results: 'true',
  utterance_end_ms: '3000',
  filler_words: 'true'
};

export default function MeetTranscriptionSection({ onLatestSentence }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicConnected, setIsMicConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [latestSentence, setLatestSentence] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Not Connected');

  // Refs for streams and connections
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const micStreamRef = useRef(null);
  const displayStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const keepAliveRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, currentTranscript]);

  const extractLatestSentence = (text) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length > 0) {
      const latest = sentences[sentences.length - 1].trim();
      setLatestSentence(latest);
      onLatestSentence?.(latest);
    } else if (text.trim()) {
      setLatestSentence(text.trim());
      onLatestSentence?.(text.trim());
    }
  };

  const addMessage = (text, type = 'final', speaker = null) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      text,
      type,
      speaker,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // Group words by speaker for diarization
  const groupWordsBySpeaker = (words) => {
    const segments = [];
    let current = null;

    words.forEach(word => {
      const speaker = word.speaker ?? 0;
      if (!current || current.speaker !== speaker) {
        if (current) segments.push(current);
        current = { speaker, text: word.word, start: word.start };
      } else {
        current.text += ' ' + word.word;
      }
    });

    if (current) segments.push(current);
    return segments;
  };

  const connectToMeeting = async () => {
    try {
      setError(null);
      setStatus('Requesting screen share...');

      // Step 1: Get screen/tab capture with audio
      // Use surfaceSwitching: 'exclude' to prevent browser from switching to shared tab
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser'  // Prefer browser tabs
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false
        },
        preferCurrentTab: false,  // Don't prefer current tab (we want to share Meet)
        selfBrowserSurface: 'exclude',  // Exclude current tab from options
        surfaceSwitching: 'exclude',  // IMPORTANT: Prevents switching to shared tab
        systemAudio: 'include'  // Include system/tab audio
      });

      displayStreamRef.current = displayStream;

      // WORKAROUND: Chrome switches to shared tab, so we need to refocus our app
      // Use a small delay to let the browser complete the switch, then switch back
      setTimeout(() => {
        window.focus();
      }, 100);

      // Show video preview
      if (videoRef.current) {
        videoRef.current.srcObject = displayStream;
      }

      const tabAudioTracks = displayStream.getAudioTracks();
      const hasTabAudio = tabAudioTracks.length > 0;

      if (hasTabAudio) {
        console.log('✅ Tab audio found:', tabAudioTracks[0].label);
      } else {
        console.warn('⚠️ No tab audio - check "Also share tab audio"');
      }

      setIsConnected(true);
      setStatus('Connected to meeting');

      // Handle stream end
      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen sharing stopped');
        disconnectAll();
      });

      // Automatically try to connect microphone
      await connectMicrophone();

    } catch (err) {
      console.error('Error connecting to meeting:', err);
      setError(err.message || 'Failed to connect to meeting');
      setStatus('Not Connected');
    }
  };

  const connectMicrophone = async () => {
    try {
      setError(null);
      setStatus('Connecting microphone...');

      // Step 1: Get microphone access
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      micStreamRef.current = micStream;

      // Step 2: Mix audio sources if we have tab audio
      let combinedStream;
      const tabAudioTracks = displayStreamRef.current?.getAudioTracks() || [];
      const hasTabAudio = tabAudioTracks.length > 0;

      if (hasTabAudio) {
        // Mix microphone + tab audio
        audioContextRef.current = new AudioContext();
        const destination = audioContextRef.current.createMediaStreamDestination();

        const micSource = audioContextRef.current.createMediaStreamSource(micStream);
        micSource.connect(destination);

        const tabSource = audioContextRef.current.createMediaStreamSource(new MediaStream(tabAudioTracks));
        tabSource.connect(destination);

        combinedStream = destination.stream;
        console.log('✅ Audio mixed: Microphone + Tab audio');
      } else {
        combinedStream = micStream;
        console.log('Using microphone only');
      }

      // Step 3: Connect to Deepgram directly (no backend token needed!)
      const params = new URLSearchParams(DEEPGRAM_PARAMS);
      const wsUrl = `${DEEPGRAM_URL}?${params.toString()}`;
      
      console.log('🎤 Connecting to Deepgram...');
      const socket = new WebSocket(wsUrl, ['token', DEEPGRAM_API_KEY]);

      socket.onopen = () => {
        console.log('✅ Connected to Deepgram');
        setIsMicConnected(true);
        setStatus('Transcribing...');
        addMessage('🎤 Listening... transcription active!', 'system');

        // Create MediaRecorder for audio streaming
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
        console.log('MediaRecorder created with mimeType:', mimeType);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        mediaRecorder.onerror = (e) => console.error('MediaRecorder error:', e.error);
        mediaRecorder.onstart = () => console.log('🎤 Recording started - SPEAK NOW!');

        mediaRecorder.start(250); // Send chunks every 250ms
        mediaRecorderRef.current = mediaRecorder;

        // Keep-alive to prevent timeout
        keepAliveRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'KeepAlive' }));
          }
        }, 10000);
      };

      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          
          if (data.type === 'Results') {
            const alternatives = data.channel?.alternatives;
            if (!alternatives?.length) return;

            const { transcript: text, words } = alternatives[0];
            const isFinal = data.is_final;

            if (!text?.trim()) return;

            if (isFinal && words?.length) {
              // Group words by speaker for diarization
              const segments = groupWordsBySpeaker(words);
              segments.forEach(seg => {
                addMessage(seg.text, 'final', seg.speaker);
                extractLatestSentence(seg.text);
              });
              console.log(`✅ Added ${segments.length} segment(s)`);
            } else if (isFinal && text.trim()) {
              addMessage(text, 'final');
              extractLatestSentence(text);
            } else if (!isFinal && text.trim()) {
              setCurrentTranscript(text);
            }
          } else if (data.type === 'SpeechStarted') {
            console.log('🎤 Speech detected!');
          } else if (data.type === 'UtteranceEnd') {
            console.log('Utterance ended');
            setCurrentTranscript('');
          } else if (data.type === 'Error') {
            console.error('Deepgram error:', data);
            setError('Deepgram error: ' + (data.message || 'Unknown error'));
          }
        } catch (e) {
          console.error('Parse error:', e.message);
        }
      };

      socket.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
        setError('Connection error. Please try again.');
      };

      socket.onclose = (e) => {
        console.log('WebSocket closed', { code: e.code });
        setIsMicConnected(false);
        setCurrentTranscript('');
        if (keepAliveRef.current) {
          clearInterval(keepAliveRef.current);
          keepAliveRef.current = null;
        }
        setStatus(isConnected ? 'Connected to meeting' : 'Not Connected');
      };

      socketRef.current = socket;

    } catch (err) {
      console.error('Error connecting microphone:', err);
      setError(err.message || 'Failed to connect microphone');
      setStatus(isConnected ? 'Connected to meeting' : 'Not Connected');
    }
  };


  const disconnectMicrophone = () => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    // Clear keep-alive interval
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    // Stop microphone stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Close WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      socketRef.current.close();
    }
    socketRef.current = null;

    setIsMicConnected(false);
    setCurrentTranscript('');
    setStatus(isConnected ? 'Connected to meeting (mic off)' : 'Not Connected');
    addMessage('⏹ Microphone disconnected', 'system');
  };


  const disconnectAll = () => {
    disconnectMicrophone();

    // Stop display stream
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach(track => track.stop());
      displayStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsConnected(false);
    setStatus('Not Connected');
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);


  return (
    <section className="section meet-section" ref={containerRef}>
      {/* Video Preview Area */}
      <div className="meet-video-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="meet-video"
        />

        {/* Fullscreen toggle button */}
        <button
          className="fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          )}
        </button>

        {/* Placeholder when not connected */}
        {!isConnected && (
          <div className="video-placeholder">
            <p>Click "Connect to meeting" to share a tab</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="meet-controls">
        <button
          className="control-btn connect-btn"
          onClick={isConnected ? disconnectAll : connectToMeeting}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M20 18c0 .55-.45 1-1 1h-1c-.55 0-1-.45-1-1v-1c0-.55.45-1 1-1h1c.55 0 1 .45 1 1v1zm0-6c0 .55-.45 1-1 1h-1c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h1c.55 0 1 .45 1 1v6zM4 6c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1H5c-.55 0-1-.45-1-1V6z"/>
          </svg>
          {isConnected ? 'Disconnect meeting' : 'Connect to meeting'}
        </button>

        <button
          className={`control-btn mic-btn ${isMicConnected ? 'connected' : ''}`}
          onClick={isMicConnected ? disconnectMicrophone : connectMicrophone}
          disabled={!isConnected}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            {isMicConnected ? (
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            ) : (
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
            )}
          </svg>
          {isMicConnected ? 'Disconnect Microphone' : 'Connect Microphone'}
        </button>

        <button className="info-btn" title="Status">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </button>
      </div>

      {/* Status indicator */}
      <div className="meet-status">
        <span className={`status-dot ${isMicConnected ? 'online' : isConnected ? 'connecting' : 'offline'}`}></span>
        <span>{status}</span>
      </div>

      {error && <p className="error">{error}</p>}

      {/* Transcript Display (collapsible) */}
      <div className="transcript-panel">
        <h3>📝 Live Transcription</h3>
        <div className="transcript-messages">
          {messages.length === 0 && !currentTranscript && (
            <p className="placeholder-text">
              Transcription will appear here when you connect...
            </p>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`transcript-message ${msg.type}`}>
              <span className="message-time">{msg.timestamp}</span>
              <span className="message-text">{msg.text}</span>
            </div>
          ))}

          {currentTranscript && (
            <div className="transcript-message partial">
              <span className="message-time">...</span>
              <span className="message-text">{currentTranscript}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Latest Sentence for AI Agent */}
      {latestSentence && (
        <div className="latest-sentence-bar">
          <span className="latest-label">📍 Latest:</span>
          <span className="latest-text">{latestSentence}</span>
        </div>
      )}
    </section>
  );
}
