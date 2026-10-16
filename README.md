# AI Requirement Analyzer

AI Requirement Analyzer is a Chrome extension and local FastAPI service that turns live meeting captions into clearer, more testable software requirements. It identifies ambiguities, guides a user through clarification questions, generates functional and non-functional requirements, compares quality before and after clarification, and exports a report.

> The extension reads live-caption text only. Turn on captions in the meeting before using it.

## What it does

1. Collects live captions from a supported meeting page and stores the transcript in Chrome local storage.
2. Sends the transcript to the local API for AI-assisted ambiguity analysis and up to four clarification questions.
3. Captures answers one question at a time.
4. Generates refined functional and non-functional requirements.
5. Compares requirements produced with and without clarifications across clarity, completeness, testability, consistency, and overall quality.
6. Exports the transcript, analysis, answers, requirements, and evaluation as TXT, DOCX, or PDF.

## Supported meeting pages

- **Google Meet** — primary integration; enable Live Captions to collect transcript text.
- **Zoom** — included as a best-effort caption selector integration. Its page structure can change, so caption collection may require maintenance.

The extension can also manually re-scan the current page with **Capture Page**.

## Architecture

```text
Google Meet / Zoom captions
           │
           ▼
Chrome extension (content.js)
  ├─ deduplicates and stores transcript locally
  └─ triggers analysis after 10 seconds without new captions
           │ HTTP (localhost)
           ▼
FastAPI backend ──► Groq API (openai/gpt-oss-20b)
           │
           ▼
Extension popup: analysis → clarifications → requirements → evaluation/export
```

## Prerequisites

- Google Chrome or another Chromium-based browser with extension developer mode
- Python 3.10 or later
- A [Groq API key](https://console.groq.com/keys)
- Meeting captions enabled in Google Meet or Zoom

## Setup

### 1. Configure and start the backend

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` and add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key
```

Start the local API:

```powershell
uvicorn main:app --reload
```

The service listens at `http://127.0.0.1:8000`. Confirm it is available at `http://127.0.0.1:8000/health`.

### 2. Load the Chrome extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the repository's `extension` folder.
5. Pin the **AI Requirement Analyzer** extension if desired.

The extension is configured to call the backend at `http://127.0.0.1:8000`. Keep the backend running while you use the extension.

## How to use it

1. Join a Google Meet or Zoom meeting and turn on live captions.
2. Open the extension popup. Captions are collected automatically; use **Capture Page** to scan immediately.
3. Select **Analyze Transcript** to identify ambiguities and obtain clarification questions. Live capture also schedules analysis after caption activity stops for 10 seconds.
4. Submit answers to the clarification questions.
5. Select **Generate Requirements** to create refined functional and non-functional requirements.
6. Select **Compare & Evaluate** to assess requirements generated with and without clarification answers.
7. Export the complete report as TXT, DOCX, or PDF.

## Backend API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Returns a service status message |
| `GET` | `/health` | Health check |
| `POST` | `/analyze-transcript` | Detects ambiguities and creates clarification questions |
| `POST` | `/generate-requirements` | Produces refined requirements from a transcript and answers |
| `POST` | `/evaluate` | Compares requirements before and after clarification |
| `POST` | `/export/txt` | Downloads a text report |
| `POST` | `/export/docx` | Downloads a Word report |
| `POST` | `/export/pdf` | Downloads a PDF report |

The analysis endpoint expects `{ "transcript": "..." }`. Requirement generation and evaluation accept a transcript plus an optional `clarifications` array of `{ "question": "...", "answer": "..." }` objects.

## Project structure

```text
.
├── backend/
│   ├── main.py          # FastAPI routes and report exports
│   ├── ai_service.py    # Groq client and model calls
│   ├── prompts.py       # Analysis, generation, and evaluation prompts
│   ├── models.py        # Request schemas
│   └── requirements.txt # Python dependencies
├── extension/
│   ├── manifest.json    # Chrome Extension Manifest V3 configuration
│   ├── content.js       # Caption monitoring, storage, and live analysis
│   ├── popup.html       # Extension interface
│   ├── popup.js         # Popup workflow and backend requests
│   └── popup.css        # Popup styling
└── README.md
```

## Data and security notes

- Captured transcripts, analysis results, and clarification state are stored in `chrome.storage.local` until cleared from the popup.
- Transcripts and clarification answers are sent to your local backend, which forwards prompts to Groq for AI processing.
- Keep `backend/.env` private. It is ignored by Git and must never contain a key committed to source control.
- The backend currently enables permissive CORS for local development. Restrict allowed origins before deploying it outside a trusted local environment.

## Technology stack

- Chrome Extension Manifest V3, vanilla HTML/CSS/JavaScript
- FastAPI and Uvicorn
- Groq Python SDK with `openai/gpt-oss-20b`
- `python-docx` and ReportLab for DOCX/PDF exports
