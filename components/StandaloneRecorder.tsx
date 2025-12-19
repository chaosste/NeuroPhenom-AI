
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, Square, Loader2, Activity, Volume2 } from 'lucide-react';
import Button from './Button';

interface StandaloneRecorderProps {
  onComplete: (transcriptText: string, audioBlob: Blob) => void;
  onCancel: () => void;
}

const StandaloneRecorder: React.FC<StandaloneRecorderProps> = ({ onComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
  };

  const createBlob = (data: Float32Array): { data: string; mimeType: string } => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) { int16[i] = data[i] * 32768; }
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Traditional MediaRecorder for the final audio file
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.start();

      // Gemini Live API for real-time transcription
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputAudioContext = new AudioContext({ sampleRate: 16000 });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
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
            if (message.serverContent?.inputTranscription) {
              setTranscript(prev => prev + message.serverContent!.inputTranscription!.text);
            }
          },
          onerror: (e) => console.error("Transcription Link Error", e),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: "You are a silent observer. Just transcribe the audio. Do not speak."
        },
      });
      sessionRef.current = await sessionPromise;
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    setIsProcessing(true);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (sessionRef.current) sessionRef.current.close();
        onComplete(transcript, audioBlob);
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-black border-t border-black">
      <div className="px-8 py-4 border-b border-black flex justify-between items-center bg-white z-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-neutral-200'}`} />
          Standalone Recorder
        </h2>
        <div className="flex gap-4">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isProcessing}>Cancel</Button>
          {isRecording && <Button variant="danger" size="sm" onClick={stopRecording} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="animate-spin mr-2" size={12} /> : <Square size={12} className="mr-2" />}
            Finish
          </Button>}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-50 overflow-hidden">
        {!isRecording ? (
          <div className="text-center animate-in fade-in duration-500">
            <Mic size={64} className="mx-auto mb-8 opacity-20" />
            <h3 className="text-4xl font-black uppercase tracking-tighter mb-4">Ready to Record</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-12">Capture physical sessions for later mapping</p>
            <Button size="lg" onClick={startRecording}>Start Capturing</Button>
          </div>
        ) : (
          <div className="w-full max-w-4xl flex flex-col h-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-black opacity-10" />
              <Activity className="animate-pulse" size={16} />
              <div className="flex-1 h-px bg-black opacity-10" />
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 bg-white border border-black p-12 overflow-y-auto no-scrollbar shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]"
            >
              <div className="flex items-center gap-2 mb-6 opacity-30">
                <Volume2 size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Live Transcription Stream</span>
              </div>
              <p className="text-2xl font-bold font-mono tracking-tight leading-relaxed uppercase">
                {transcript || "Listening for input..."}
                <span className="inline-block w-2 h-6 bg-black ml-1 animate-pulse" />
              </p>
            </div>
            
            <div className="mt-8 flex justify-between items-center opacity-30">
              <span className="text-[8px] font-mono font-black uppercase">Buffer: Active</span>
              <span className="text-[8px] font-mono font-black uppercase">Sampling: 16kHz PCM</span>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-8">
          <div className="text-center border-2 border-black p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-red-600 font-black uppercase mb-8">Error: {error}</p>
            <Button size="md" onClick={onCancel}>Return Home</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandaloneRecorder;
