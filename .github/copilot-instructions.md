# NeuroPhenom-AI - Professional Neurophenomenology Platform

NeuroPhenom-AI is a React + TypeScript application that uses Micro-phenomenology interview techniques and Google's Gemini AI to map the micro-dynamics of subjective experience. Built with Vite and designed for clinical-grade introspective interviews.

## Build, Test, and Development Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:8080)
npm run dev

# TypeScript compilation + production build
npm run build

# Preview production build (port 8080)
npm run preview

# Serve production build with serve
npm start
```

## Architecture

### Application Overview

NeuroPhenom-AI implements a sophisticated interview system based on Micro-phenomenology (Explicitation Interview) methodology. The app conducts AI-guided interviews to help users explore and articulate pre-reflective subjective experiences.

**Core methodology:**
- **SINGULARITY**: Guide to specific, singular instances
- **EPOCHÉ**: Suspend beliefs/theories about experience
- **EVOCATION**: Relive past situations with sensory cues
- **REDIRECTION**: Focus on process ("how") not content ("what")
- **RECURSIVE CLARIFICATION**: Ground vague/abstract responses in concrete details
- **NO WHY**: Never ask "why" - avoids speculation and theory-building

### Project Structure

```
components/
├── LiveInterviewSession.tsx    # Real-time AI interview with Gemini Live API
├── AnalysisView.tsx           # Post-interview analysis display
├── SettingsMenu.tsx           # User settings (API key, language, voice, mode)
├── StandaloneRecorder.tsx     # Audio recording without AI
└── Button.tsx                 # Reusable button component

services/
├── geminiService.ts           # Gemini API integration (analysis, welcome messages)
└── geminiCachingService.ts    # Context caching for Gemini

App.tsx                        # Main application shell
types.ts                       # TypeScript type definitions
constants.tsx                  # System instructions, colors, visual components
```

### Key Components

**LiveInterviewSession:**
- Uses Gemini Live API for bidirectional voice interaction
- Real-time transcription with speaker segmentation
- Implements neurophenomenology system instructions
- Supports UK/US language preferences and male/female voices
- Beginner/Advanced interview modes

**AnalysisView:**
- Post-interview structured analysis using Gemini
- Generates: Summary, Takeaways, Modalities, Diachronic/Synchronic structure
- Displays phase-based timeline of experience
- Extracts "descriptemes" (micro-experiential units)

**SettingsMenu:**
- User-provided API key (stored in localStorage, never server-side)
- Language preference (UK/US spelling and tone)
- Voice gender selection
- Interview mode (Beginner/Advanced)
- Privacy contract toggle

### State Management

**LocalStorage-based persistence:**
- Sessions: `neuro_phenom_sessions`
- Settings: `neuro_phenom_settings`
- API Key: Stored in settings, retrieved on-demand

**Session types:**
- `AI_INTERVIEW` - Live AI-guided interview
- `RECORDED` - Standalone audio recording
- `UPLOADED` - User-uploaded audio file

### Gemini Live API Integration

**LiveInterviewSession workflow:**
1. Initialize WebSocket connection to Gemini Live
2. Configure with system instructions based on settings
3. Stream bidirectional audio (16kHz PCM16)
4. Track real-time transcription with speaker labels
5. Automatically save transcript on completion

**System instruction parameters:**
- Language (UK/US): Affects spelling, vocabulary, tone
- Mode (Beginner/Advanced): Adjusts technique sophistication
- Privacy contract: Determines consent reminders frequency

**Voice configuration:**
- UK Female: Puck
- UK Male: Charon
- US Female: Aoede
- US Male: Kore

### Analysis Pipeline

**geminiService.analyzeInterview():**
1. Receives complete transcript
2. Uses structured JSON schema for response
3. Extracts: Summary, Takeaways, Modalities, Phases, Structure, Transcript
4. Returns typed `AnalysisResult`

**Diachronic structure:** Time-based phases of experience
**Synchronic structure:** Structural configuration at frozen moments

## Key Conventions

### Environment Variables

**No environment variables required for development.**

API key is provided by users via Settings UI and stored in localStorage. This ensures:
- No API keys in source code
- No server-side key management
- User controls their own Gemini quota

### TypeScript Configuration

- Target: `ESNext`
- Module resolution: `Node`
- Strict mode enabled
- JSX: `react-jsx`
- No emit (Vite handles bundling)

### Interview Methodology

**Core principles (enforced by system instructions):**

1. **Focus on "HOW" not "WHAT"**
   - Bad: "I felt good" (evaluative)
   - Good: "There was a warmth spreading from my chest" (phenomenological)

2. **Recursive Clarification**
   - When user provides vague/abstract responses, STOP and clarify
   - Don't advance timeline until grounded in concrete details
   - Example: "When you say 'weird', what was the specific physical sensation?"

3. **Temporal Structure**
   - Diachronic: Unfolding over time ("What happened then?")
   - Synchronic: Frozen moment configuration ("Where in your body?")

4. **Privacy Contract** (if enabled)
   - Frequent reminders of user control
   - Preface deep prompts with "If you agree..."
   - User can stop/skip at any time

### Audio Processing

**Format requirements:**
- Sample rate: 16kHz
- Encoding: PCM16 (Linear PCM, 16-bit)
- Base64 encoding for WebSocket transmission

**Browser compatibility:**
- Uses Web Audio API (`AudioContext`)
- Requires microphone permissions
- HTTPS required in production

### Styling

**Minimalist black/white aesthetic:**
- Primary: `#000000` (black)
- Background: `#ffffff` (white)
- Border: `#e5e5e5` (light gray)
- Monospace font for code/references
- Clean, clinical interface

**Design philosophy:**
- Stark, professional appearance
- Focus on content over decoration
- Clear visual hierarchy
- Responsive layout

## Deployment

### Docker + Cloud Run

**Dockerfile:**
- Multi-stage build (Node build + nginx serve)
- Static file serving via nginx
- Port 8080 (Cloud Run standard)

**cloudbuild.yaml:**
- Automated builds on push
- Deploy to Cloud Run (us-central1)
- Unauthenticated access

**Build process:**
```bash
npm run build  # TypeScript compile + Vite build
docker build -t neuro-phenom-ai .
docker run -p 8080:8080 neuro-phenom-ai
```

### Local Development

1. No environment setup needed
2. Run `npm install && npm run dev`
3. Users add their Gemini API key via Settings UI
4. Microphone permissions required for live interviews

### Production Considerations

- **HTTPS required** for microphone access
- **No server-side secrets** - all API calls client-side
- **CORS**: Ensure Gemini API allows your domain
- **Session persistence**: LocalStorage only (no backend)

## API Key Management

**User-provided keys:**
- Users get their own key from [Google AI Studio](https://aistudio.google.com/apikey)
- Entered via Settings menu
- Stored in localStorage (`neuro_phenom_settings`)
- Never transmitted to any server except Google's Gemini API

**Security:**
- Client-side only application
- No backend to compromise
- User controls their own quota and billing
- Keys never exposed in source code

## Interview Modes

### Beginner Mode

- Foundational Micro-phenomenology techniques
- Help user find specific moment
- Evoke vividly
- Describe "how" rather than "what"
- Gentle guidance

### Advanced Mode

- Temporal neuroslicing
- Transmodality exploration (cross-sense descriptions)
- Gestalt emergence focus
- Sophisticated probing techniques
- Assumes familiarity with methodology

## Analysis Features

**Post-interview analysis includes:**

1. **Summary** - High-level overview of experience
2. **Takeaways** - Key insights (3-5 bullet points)
3. **Modalities** - Sensory channels involved (visual, auditory, kinesthetic, etc.)
4. **Phases** - Diachronic structure with timestamps
5. **Synchronic Structure** - Categorical breakdown of experience dimensions
6. **Descriptemes** - Micro-experiential units extracted from transcript

**Analysis is structured** using Gemini's JSON schema enforcement for consistency.

## Important Notes

- **Project root**: `/Users/stephenbeale/Projects/NeuroPhenom-AI/`
- **No backend required** - Fully client-side application
- **Microphone access** - Essential for live interviews, requires HTTPS in production
- **Privacy-first design** - All data stays in user's browser (localStorage)
- **Clinical methodology** - Based on established Micro-phenomenology/Explicitation Interview techniques
- **Gemini Live API** - Uses bidirectional streaming for real-time voice interaction
- **Version**: 1.3.3
