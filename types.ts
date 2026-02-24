
export enum LanguagePreference {
  UK = 'UK',
  US = 'US'
}

export enum VoiceGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export enum InterviewMode {
  BEGINNER = 'BEGINNER',
  ADVANCED = 'ADVANCED'
}

export enum VoiceProvider {
  GEMINI = 'GEMINI',
  AZURE_OPENAI_REALTIME = 'AZURE_OPENAI_REALTIME',
  AZURE_STT_TTS = 'AZURE_STT_TTS'
}

export interface Settings {
  language: LanguagePreference;
  voiceGender: VoiceGender;
  privacyContract: boolean;
  increasedSensitivityMode: boolean;
  interviewMode: InterviewMode;
  persistLocalData: boolean;
  voiceProvider?: VoiceProvider;
  apiKey?: string;
}

export interface SpeakerSegment {
  speaker: 'Interviewer' | 'Interviewee' | 'AI';
  text: string;
  startTime?: number;
}

export interface Descripteme {
  id: string;
  text: string;
  category?: string;
  phase?: string;
}

export interface AnalysisResult {
  summary: string;
  takeaways: string[];
  modalities: string[];
  phasesCount: number;
  codebookSuggestions?: {
    label: string;
    rationale: string;
    exemplarQuote: string;
  }[];
  diachronicStructure: {
    phaseName: string;
    description: string;
    startTime: string;
  }[];
  synchronicStructure: {
    category: string;
    details: string;
  }[];
  transcript: SpeakerSegment[];
}

export interface Code {
  id: string;
  name: string;
  color: string;
}

export interface Annotation {
  id: string;
  codeId: string;
  segmentIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface InterviewSession {
  id: string;
  date: string;
  duration: number;
  type: 'AI_INTERVIEW' | 'RECORDED' | 'UPLOADED';
  analysis?: AnalysisResult;
  codes: Code[];
  annotations: Annotation[];
  audioUrl?: string;
}
