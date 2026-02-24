import { Settings, VoiceProvider } from '../types';

const parseProvider = (value?: string): VoiceProvider | null => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === VoiceProvider.GEMINI) return VoiceProvider.GEMINI;
  if (normalized === VoiceProvider.AZURE_OPENAI_REALTIME) return VoiceProvider.AZURE_OPENAI_REALTIME;
  if (normalized === VoiceProvider.AZURE_STT_TTS) return VoiceProvider.AZURE_STT_TTS;
  return null;
};

export const resolveVoiceProvider = (settings: Settings): VoiceProvider => {
  const envProvider = parseProvider(import.meta.env.VITE_VOICE_PROVIDER_DEFAULT);
  const explicitProvider = settings.voiceProvider || null;
  return explicitProvider || envProvider || VoiceProvider.GEMINI;
};

export const isGeminiProvider = (settings: Settings): boolean => {
  return resolveVoiceProvider(settings) === VoiceProvider.GEMINI;
};

export const providerLabel = (provider: VoiceProvider): string => {
  switch (provider) {
    case VoiceProvider.AZURE_OPENAI_REALTIME:
      return 'Azure OpenAI Realtime';
    case VoiceProvider.AZURE_STT_TTS:
      return 'Azure STT + TTS';
    case VoiceProvider.GEMINI:
    default:
      return 'Gemini Live';
  }
};
