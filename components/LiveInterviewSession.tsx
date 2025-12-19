
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Settings, LanguagePreference, VoiceGender, SpeakerSegment } from '../types';
import { NEURO_PHENOM_SYSTEM_INSTRUCTION } from '../constants';
import Button from './Button';
import { Mic, PhoneOff, Terminal, User, Bot } from 'lucide-react';

interface LiveInterviewSessionProps {
  settings: Settings;
  onComplete: (transcript: SpeakerSegment[]) => void;
  onCancel: () => void;
}

const LiveInterviewSession: React.FC<LiveInterviewSessionProps> = ({ settings, onComplete, onCancel }) => {
  const [isActive, setIsActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<{ speaker: 'AI' | 'Interviewee', text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptHistoryRef = useRef<SpeakerSegment[]>([]);
  const currentOutputTranscriptionRef = useRef<string>('');
  const currentInputTranscriptionRef = useRef<string>('');
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveTranscript]);

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
      sessionStartTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);

      let voiceName = 'Zephyr';
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

            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
            }

            if (message.serverContent?.turnComplete) {
              const timestamp = (Date.now() - sessionStartTimeRef.current) / 1000;
              if (currentInputTranscriptionRef.current) {
                const text = currentInputTranscriptionRef.current;
                transcriptHistoryRef.current.push({ speaker: 'Interviewee', text, startTime: timestamp });
                setLiveTranscript(prev => [...prev, { speaker: 'Interviewee', text }]);
              }
              if (currentOutputTranscriptionRef.current) {
                const text = currentOutputTranscriptionRef.current;
                transcriptHistoryRef.current.push({ speaker: 'AI', text, startTime: timestamp });
                setLiveTranscript(prev => [...prev, { speaker: 'AI', text }]);
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
    <div className="flex flex-col h-full bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
            Live Phenomenological Interview
          </h2>
          <p className="text-sm text-slate-400">Capturing pre-reflective experience dynamics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" onClick={onCancel} className="gap-2">
            <PhoneOff size={18} /> Cancel
          </Button>
          {isActive && (
            <Button variant="secondary" size="sm" onClick={endSession} className="gap-2 bg-slate-700 text-white hover:bg-slate-600">
              Complete & Analyze
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {!isActive && !error && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-8 border border-blue-500/30">
              <Mic size={48} className="text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Initialize Neuro-Phenom Link</h3>
            <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
              Ensure you are in a quiet environment. Your AI guide will use the 2.5 Flash Native Audio model for low-latency deep exploration.
            </p>
            <Button size="lg" onClick={startSession} className="gap-2 px-12 h-14 rounded-xl text-lg shadow-lg shadow-blue-500/20">
              Start Voice Link
            </Button>
          </div>
        )}

        {isActive && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-4 text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-800 pb-2">
              <Terminal size={14} /> Subjective Stream
            </div>
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto space-y-4 pr-4 scroll-smooth"
            >
              {liveTranscript.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-slate-600 italic">Waiting for connection...</p>
                </div>
              )}
              {liveTranscript.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 animate-in slide-in-from-bottom-2 duration-300 ${msg.speaker === 'AI' ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${msg.speaker === 'AI' ? 'bg-[#0047AB]' : 'bg-slate-700'}`}>
                    {msg.speaker === 'AI' ? <Bot size={18} /> : <User size={18} />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.speaker === 'AI' ? 'bg-blue-900/40 text-blue-50 border border-blue-800/50 rounded-tl-none' : 'bg-[#0047AB] text-white rounded-tr-none'}`}>
                    <p className="font-black text-[10px] uppercase opacity-60 mb-1 tracking-widest">
                      {msg.speaker === 'AI' ? 'AI Guide' : 'Interviewee'}
                    </p>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Visualizer Footer */}
            <div className="mt-4 flex items-center justify-center gap-1.5 h-12">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-blue-500/50 rounded-full transition-all duration-150"
                  style={{ height: `${Math.random() * 100 + 10}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-red-400 p-8 bg-red-900/10 border border-red-900/30 rounded-2xl max-w-sm">
              <p className="font-bold mb-2">Interface Error</p>
              <p className="text-sm opacity-80">{error}</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-4 border-red-900/50 text-red-400 hover:bg-red-900/20">Retry</Button>
            </div>
          </div>
        )}

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      </div>

      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono tracking-tighter uppercase">
        Neurophenomenology v1.2 • Elicitation Engine Alpha • Gemini-2.5-Flash
      </div>
    </div>
  );
};

export default LiveInterviewSession;
