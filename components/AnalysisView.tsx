
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, Code, Annotation, InterviewSession } from '../types';
import { 
  Code as CodeIcon, 
  Play, 
  Pause, 
  Download, 
  X,
  History,
  Clock,
  FileText,
  Plus,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import Button from './Button';
import { COLORS } from '../constants';

interface AnalysisViewProps {
  session: InterviewSession;
  onUpdate: (session: InterviewSession) => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ session, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'coding' | 'report'>('coding');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selection, setSelection] = useState<{ segmentIndex: number; start: number; end: number; rect: DOMRect | null } | null>(null);
  const [newCodeName, setNewCodeName] = useState('');
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const updateTime = () => setCurrentTime(audio.currentTime);
      audio.addEventListener('timeupdate', updateTime);
      return () => audio.removeEventListener('timeupdate', updateTime);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTextSelection = (segmentIndex: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { setSelection(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const start = Math.min(sel.anchorOffset, sel.focusOffset);
    const end = Math.max(sel.anchorOffset, sel.focusOffset);
    setSelection({ segmentIndex, start, end, rect });
  };

  const applyCode = (codeId: string) => {
    if (!selection) return;
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      codeId,
      segmentIndex: selection.segmentIndex,
      startOffset: selection.start,
      endOffset: selection.end,
      text: session.analysis?.transcript[selection.segmentIndex].text.substring(selection.start, selection.end) || ''
    };
    onUpdate({ ...session, annotations: [...session.annotations, newAnnotation] });
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const addCode = () => {
    if (!newCodeName.trim()) return;
    const newCode: Code = {
      id: crypto.randomUUID(),
      name: newCodeName,
      color: COLORS.codeColors[session.codes.length % COLORS.codeColors.length]
    };
    onUpdate({ ...session, codes: [...session.codes, newCode] });
    setNewCodeName('');
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <audio ref={audioRef} src={session.audioUrl} />

      {/* Control Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-black">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <button onClick={togglePlayback} className="w-10 h-10 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-all">
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-widest uppercase">{formatTime(currentTime)} / {formatTime(session.duration)}</span>
              <div className="w-32 h-1 bg-neutral-100 mt-1 relative">
                <div className="absolute top-0 left-0 h-full bg-black transition-all" style={{ width: `${(currentTime / session.duration) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="h-8 w-px bg-neutral-200 hidden md:block" />
          <div className="hidden md:flex gap-4">
            <Button variant="outline" size="sm" onClick={() => {}} className="border-neutral-200 text-neutral-400">Export PDF</Button>
            <Button variant="outline" size="sm" onClick={() => {}}>Metadata</Button>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('coding')}
            className={`text-[10px] font-black uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${activeTab === 'coding' ? 'border-black' : 'border-transparent text-neutral-400'}`}
          >
            Transcript
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`text-[10px] font-black uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${activeTab === 'report' ? 'border-black' : 'border-transparent text-neutral-400'}`}
          >
            Synthesis
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'coding' ? (
          <>
            <div className="flex-1 overflow-y-auto p-12 md:p-24 border-r border-black">
              <div className="max-w-2xl mx-auto space-y-16">
                <div className="mb-16">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-neutral-400 mb-8 underline">Observation Log</h2>
                  <h3 className="text-4xl font-black uppercase tracking-tighter mb-4">{session.analysis?.summary}</h3>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{new Date(session.date).toISOString()}</p>
                </div>

                {session.analysis?.transcript.map((segment, idx) => (
                  <div key={idx} className="group relative">
                    <div className="flex items-center gap-4 mb-4 border-b border-neutral-100 pb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest">{segment.speaker}</span>
                      <span className="text-[10px] font-mono text-neutral-300">[{formatTime(segment.startTime || 0)}]</span>
                    </div>
                    <p 
                      onMouseUp={() => handleTextSelection(idx)}
                      className="text-xl leading-relaxed text-black font-medium select-text"
                    >
                      {segment.text}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      {session.annotations
                        .filter(a => a.segmentIndex === idx)
                        .map(a => {
                          const code = session.codes.find(c => c.id === a.codeId);
                          return (
                            <span 
                              key={a.id}
                              className="px-2 py-1 text-[9px] font-black uppercase border border-black flex items-center gap-2"
                            >
                              {code?.name}
                              <X size={10} className="cursor-pointer" onClick={() => onUpdate({ ...session, annotations: session.annotations.filter(an => an.id !== a.id) })} />
                            </span>
                          );
                        })
                      }
                    </div>
                  </div>
                ))}
              </div>

              {selection && (
                <div 
                  className="fixed z-[100] bg-black text-white p-4 flex flex-col gap-2 min-w-[200px] animate-in zoom-in-95"
                  style={{ top: selection.rect ? selection.rect.bottom + 10 : 0, left: selection.rect ? selection.rect.left : 0 }}
                >
                  <p className="text-[9px] font-black uppercase tracking-widest border-b border-white/20 pb-2 mb-2">Apply Taxonomic Code</p>
                  <div className="flex flex-col gap-1">
                    {session.codes.map(code => (
                      <button key={code.id} onClick={() => applyCode(code.id)} className="text-left text-[10px] font-bold uppercase py-1 hover:underline">
                        - {code.name}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setSelection(null)} className="mt-2 text-[9px] opacity-50 uppercase text-center">Cancel</button>
                </div>
              )}
            </div>

            <aside className="w-80 p-12 bg-neutral-50 overflow-y-auto">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8">Thematic Index</h3>
              <div className="mb-12">
                <input 
                  type="text" 
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value)}
                  placeholder="NEW THEME..."
                  className="w-full bg-transparent border-b border-black pb-2 text-[10px] font-bold outline-none uppercase tracking-widest mb-2"
                  onKeyDown={(e) => e.key === 'Enter' && addCode()}
                />
                <Button onClick={addCode} className="w-full" size="sm">Add to Index</Button>
              </div>

              <div className="space-y-6">
                {session.codes.map(code => (
                  <div key={code.id} className="flex flex-col gap-1 group">
                    <div className="flex justify-between items-end border-b border-neutral-200 pb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest">{code.name}</span>
                      <span className="text-[10px] font-mono opacity-30">{session.annotations.filter(a => a.codeId === code.id).length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-12 md:p-24 bg-white">
            <div className="max-w-4xl mx-auto space-y-32">
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-[0.6em] text-neutral-300 mb-12 border-b border-neutral-100 pb-4">Synthesis Abstract</h4>
                <p className="text-5xl font-black uppercase tracking-tighter leading-[0.9] italic border-l-8 border-black pl-8">
                  "{session.analysis?.summary}"
                </p>
              </section>

              <div className="grid md:grid-cols-2 gap-24">
                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-12 border-b border-black pb-4">Diachronic Sequence</h4>
                  <div className="space-y-16">
                    {session.analysis?.diachronicStructure.map((phase, i) => (
                      <div key={i} className="group">
                        <span className="text-[10px] font-black mb-2 block opacity-20">PHASE {i + 1}</span>
                        <h5 className="text-xl font-black uppercase mb-4 tracking-tight">{phase.phaseName}</h5>
                        <p className="text-sm font-medium leading-relaxed text-neutral-600">{phase.description}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-12 border-b border-black pb-4">Synchronic Qualities</h4>
                  <div className="space-y-8">
                    {session.analysis?.synchronicStructure.map((struct, i) => (
                      <div key={i} className="border border-neutral-100 p-8 hover:border-black transition-all">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-neutral-300">{struct.category}</p>
                        <p className="text-md font-bold uppercase leading-tight">{struct.details}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="pt-24 border-t border-neutral-100">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-12">Modal Component Registry</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {session.analysis?.modalities.map((m, i) => (
                    <div key={i} className="border border-black p-4 flex items-center justify-between group hover:bg-black hover:text-white transition-all">
                      <span className="text-[9px] font-black uppercase tracking-widest">{m}</span>
                      <ArrowRight size={12} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisView;
