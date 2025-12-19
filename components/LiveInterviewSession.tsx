
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Settings, LanguagePreference, VoiceGender, SpeakerSegment } from '../types';
import { NEURO_PHENOM_SYSTEM_INSTRUCTION } from '../constants';
import Button from './Button';
import { Mic, PhoneOff, Terminal, Bot, AudioLines } from 'lucide-react';

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
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; }
    }
    return buffer;
  };

  const createBlob = (data: Float32Array): { data: string; mimeType: string } => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) { int16[i] = data[i] * 32768; }
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputAudioContext = new AudioContext({ sampleRate: 16000 });
      const outputAudioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = outputAudioContext;
      sessionStartTimeRef.current = Date.now();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);

      let voiceName = settings.language === LanguagePreference.UK 
        ? (settings.voiceGender === VoiceGender.MALE ? 'Fenrir' : 'Zephyr')
        : (settings.voiceGender === VoiceGender.MALE ? 'Puck' : 'Kore');

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }
            if (message.serverContent?.outputTranscription) currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            if (message.serverContent?.inputTranscription) currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            if (message.serverContent?.turnComplete) {
              const ts = (Date.now() - sessionStartTimeRef.current) / 1000;
              if (currentInputTranscriptionRef.current) {
                setLiveTranscript(prev => [...prev, { speaker: 'Interviewee', text: currentInputTranscriptionRef.current }]);
                transcriptHistoryRef.current.push({ speaker: 'Interviewee', text: currentInputTranscriptionRef.current, startTime: ts });
              }
              if (currentOutputTranscriptionRef.current) {
                setLiveTranscript(prev => [...prev, { speaker: 'AI', text: currentOutputTranscriptionRef.current }]);
                transcriptHistoryRef.current.push({ speaker: 'AI', text: currentOutputTranscriptionRef.current, startTime: ts });
              }
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }
          },
          onerror: (e) => setError("Link Error"),
          onclose: () => setIsActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          systemInstruction: NEURO_PHENOM_SYSTEM_INSTRUCTION(settings.language, settings.interviewMode, settings.privacyContract)
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setError("Microphone access denied."); }
  };

  const endSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    onComplete(transcriptHistoryRef.current);
  };

  return (
    <div className="flex flex-col h-full bg-white text-black border-t border-black">
      <div className="p-8 border-b border-black flex justify-between items-center">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
            <div className={`w-2 h-2 ${isActive ? 'bg-black animate-pulse' : 'bg-neutral-200'}`} />
            Live Link Mode
          </h2>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" size="sm" onClick={onCancel}>Terminate</Button>
          {isActive && <Button size="sm" onClick={endSession}>Conclude & Map</Button>}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden bg-neutral-50">
        {!isActive && !error && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
            <AudioLines size={64} className="mb-12 opacity-10" />
            <h3 className="text-4xl font-black uppercase tracking-tighter mb-8">Ready for Subjective<br/>Elicitation</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 max-w-sm mb-12">
              Gemini 2.5 Flash Native Audio Interface. Synchronized transcript and metadata capture active.
            </p>
            <Button size="lg" onClick={startSession}>Initialize Link</Button>
          </div>
        )}

        {isActive && (
          <div className="flex-1 flex flex-col p-12 md:p-24 overflow-hidden">
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto space-y-12 pr-4 scroll-smooth no-scrollbar"
            >
              {liveTranscript.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-2xl ${msg.speaker === 'AI' ? 'mr-auto' : 'ml-auto items-end'}`}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-30">{msg.speaker}</span>
                  <div className={`p-6 border border-black ${msg.speaker === 'AI' ? 'bg-white' : 'bg-black text-white shadow-xl'}`}>
                    <p className="text-lg font-bold leading-tight uppercase tracking-tight">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Minimal Waveform */}
            <div className="mt-12 h-2 w-full flex gap-0.5 items-center">
              {[...Array(64)].map((_, i) => (
                <div key={i} className="flex-1 bg-black opacity-10" style={{ height: `${Math.random() * 100}%` }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-12 border border-black">
              <p className="text-[10px] font-black uppercase tracking-widest mb-4">{error}</p>
              <Button size="sm" onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveInterviewSession;
