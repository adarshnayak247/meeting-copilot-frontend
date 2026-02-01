# JarWiz AI Frontend

A modern React-based frontend for the JarWiz AI multimodal RAG system. Features real-time meeting transcription, PDF document upload, intelligent Q&A with citations, and a clean three-panel interface.

## Features

- **Real-time Meeting Transcription** - Share browser tabs (e.g., Google Meet) and get live transcription using Deepgram
- **PDF Document Upload** - Upload and process PDF documents for RAG queries
- **Intelligent Q&A** - Ask questions about your documents with AI-powered answers
- **Citations Panel** - View source citations with page numbers and snippets
- **Voice-to-Query** - Use transcribed speech to ask questions via the "AI Answer" button

## Tech Stack

- **React 19** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Deepgram** - Real-time speech-to-text transcription
- **React Markdown** - Render formatted AI responses

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running at `http://localhost:8000` (see [backend README](../README.md))

### Installation

1. Clone the repository and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your API keys:
   ```env
   VITE_DEEPGRAM_API_KEY=your_deepgram_api_key
   VITE_API_URL=http://localhost:8000
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:5173 in your browser

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ChatSection.jsx       # Chat interface with AI Q&A
│   │   ├── CitationsSection.jsx  # Citations display panel
│   │   ├── MeetTranscriptionSection.jsx  # Real-time transcription
│   │   └── PdfUploadSection.jsx  # Document upload
│   ├── App.jsx                   # Main app layout (3-panel)
│   ├── api.js                    # Backend API client
│   └── main.jsx                  # Entry point
├── .env.example                  # Environment template
├── package.json
└── vite.config.js
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_DEEPGRAM_API_KEY` | Deepgram API key for transcription | Yes (for transcription) |
| `VITE_API_URL` | Backend API URL | Yes |

## Usage

### Meeting Transcription

1. Click **"Connect to Meeting"** to share a browser tab
2. Select the tab with your meeting (e.g., Google Meet)
3. Enable **"Also share tab audio"** when prompted
4. Real-time transcription will appear in the transcript panel

### Document Q&A

1. Upload a PDF document using the upload section
2. Type a question in the chat input
3. Click send or press Enter
4. View the AI answer with citations in the right panel

### Voice-to-Query

1. Start transcription as described above
2. Speak your question during the meeting
3. Click **"AI Answer"** button to query using the latest transcribed text

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Support

- Chrome 107+ (recommended for full transcription features)
- Edge 107+
- Firefox (limited transcription support)

## License

MIT
