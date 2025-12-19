
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Settings, LanguagePreference, VoiceGender, SpeakerSegment } from '../types';
import { NEURO_PHENOM_SYSTEM_INSTRUCTION } from '../constants';
import Button from './Button';
import { Mic, MicOff, PhoneOff, Terminal } from 'lucide-react';

interface LiveInterviewSessionProps {
  settings: Settings;
  onComplete: (transcript: SpeakerSegment[]) => void;
  onCancel: () => void;
}

const LiveInterviewSession: React.FC<LiveInterviewSessionProps> = ({ settings, onComplete, onCancel }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptHistoryRef = useRef<SpeakerSegment[]>([]);
  const currentOutputTranscriptionRef = useRef<string>('');
  const currentInputTranscriptionRef = useRef<string>('');
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // PCM encoding/decoding
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const createBlob = (data: Float32Array): { data: string; mimeType: string } => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startSession = async () => {
    try {
      setError(null);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputAudioContext = new AudioContext({ sampleRate: 16000 });
      const outputAudioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = outputAudioContext;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);

      // Select voice based on settings
      let voiceName = 'Zephyr'; // Default
      if (settings.language === LanguagePreference.UK) {
        voiceName = settings.voiceGender === VoiceGender.MALE ? 'Fenrir' : 'Zephyr';
      } else {
        voiceName = settings.voiceGender === VoiceGender.MALE ? 'Puck' : 'Kore';
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Transcription
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
              setTranscription((prev) => prev + " (AI): " + text);
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
              setTranscription((prev) => prev + " (User): " + text);
            }

            if (message.serverContent?.turnComplete) {
              if (currentInputTranscriptionRef.current) {
                transcriptHistoryRef.current.push({
                  speaker: 'Interviewee',
                  text: currentInputTranscriptionRef.current
                });
              }
              if (currentOutputTranscriptionRef.current) {
                transcriptHistoryRef.current.push({
                  speaker: 'AI',
                  text: currentOutputTranscriptionRef.current
                });
              }
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }

            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live session error:", e);
            setError("An error occurred during the session.");
          },
          onclose: () => {
            setIsActive(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          },
          systemInstruction: NEURO_PHENOM_SYSTEM_INSTRUCTION(settings.language, settings.interviewMode, settings.privacyContract)
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start session:", err);
      setError("Failed to start AI interview. Check your microphone permissions.");
    }
  };

  const endSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
    }
    onComplete(transcriptHistoryRef.current);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            AI Interview Session
          </h2>
          <p className="text-sm text-slate-400">Conducting Neurophenomenology Exploration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" onClick={onCancel} className="gap-2">
            <PhoneOff size={18} /> Cancel
          </Button>
          {isActive && (
            <Button variant="secondary" size="sm" onClick={endSession} className="gap-2 bg-slate-700 text-white hover:bg-slate-600">
              End & Analyze
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated Sound Wave Visualizer Mock */}
        <div className="flex items-center justify-center gap-1.5 h-32 mb-12">
          {[...Array(isActive ? 24 : 12)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 bg-blue-500 rounded-full transition-all duration-200"
              style={{
                height: isActive ? `${Math.random() * 100 + 10}%` : '8px',
                opacity: 0.7 - (i * 0.02)
              }}
            />
          ))}
        </div>

        {!isActive && !error && (
          <div className="text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mic size={40} className="text-blue-500" />
            </div>
            <h3 className="text-2xl font-semibold mb-4">Ready to Begin?</h3>
            <p className="text-slate-400 mb-8">
              Your AI guide is prepared to conduct a deep phenomenological exploration of your experience.
            </p>
            <Button size="lg" onClick={startSession} className="gap-2 px-12">
              Start Voice Interview
            </Button>
          </div>
        )}

        {isActive && (
          <div className="w-full max-w-2xl bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 backdrop-blur-sm h-64 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <Terminal size={14} /> Real-time Transcription
            </div>
            <p className="text-lg text-slate-300 leading-relaxed font-light">
              {transcription || "Listening for your voice..."}
            </p>
          </div>
        )}

        {error && (
          <div className="text-center text-red-400 p-4 bg-red-900/20 border border-red-900/50 rounded-xl">
            {error}
          </div>
        )}

        {/* Ambient Decorative Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[100px] -z-10" />
      </div>

      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 text-center">
        <p className="text-xs text-slate-500">
          Neurophenomenology Version • AI powered by Gemini 2.5 Flash
        </p>
      </div>
    </div>
  );
};

export default LiveInterviewSession;
