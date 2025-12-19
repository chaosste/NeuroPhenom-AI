
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
  ArrowRight,
  ChevronDown,
  Layout,
  Layers
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
    
    // Check if the selection is within the same node
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    // Fix: Cast to HTMLElement to safely access classList as range container is a Node
    const parent = (container.nodeType === 3 ? container.parentElement : container) as HTMLElement | null;
    
    // Only allow selection inside segment text
    if (!parent?.classList?.contains('segment-text-container')) {
      setSelection(null);
      return;
    }

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

  const renderSegmentText = (text: string, segmentIndex: number) => {
    const segmentAnnotations = session.annotations
      .filter(a => a.segmentIndex === segmentIndex)
      .sort((a, b) => a.startOffset - b.startOffset);

    if (segmentAnnotations.length === 0) {
      return (
        <p 
          onMouseUp={() => handleTextSelection(segmentIndex)}
          className="segment-text-container text-xl leading-relaxed text-black font-medium select-text"
        >
          {text}
        </p>
      );
    }

    let lastIndex = 0;
    const parts = [];

    segmentAnnotations.forEach((anno, i) => {
      // Add text before annotation
      if (anno.startOffset > lastIndex) {
        parts.push(text.substring(lastIndex, anno.startOffset));
      }
      
      const code = session.codes.find(c => c.id === anno.codeId);
      parts.push(
        <mark 
          key={anno.id}
          className="bg-black/5 border-b-2 border-black relative group/mark cursor-help px-0.5"
          title={code?.name}
        >
          {text.substring(anno.startOffset, anno.endOffset)}
          <span className="absolute -top-6 left-0 text-[8px] font-black uppercase tracking-tighter bg-black text-white px-1 opacity-0 group-hover/mark:opacity-100 transition-opacity whitespace-nowrap z-10">
            {code?.name}
          </span>
        </mark>
      );
      
      lastIndex = anno.endOffset;
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return (
      <div 
        onMouseUp={() => handleTextSelection(segmentIndex)}
        className="segment-text-container text-xl leading-relaxed text-black font-medium select-text"
      >
        {parts}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden font-sans">
      <audio ref={audioRef} src={session.audioUrl} />

      {/* Control Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-black bg-white z-10">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-5">
            <button 
              onClick={togglePlayback} 
              className="w-12 h-12 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <div className="flex flex-col">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-[11px] font-black tracking-widest uppercase">{formatTime(currentTime)}</span>
                <span className="text-[9px] font-bold text-neutral-300">/ {formatTime(session.duration)}</span>
              </div>
              <div className="w-48 h-1.5 bg-neutral-100 mt-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-black transition-all duration-100" style={{ width: `${(currentTime / session.duration) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="h-10 w-px bg-neutral-200 hidden lg:block" />
          <div className="hidden lg:flex gap-4">
            <Button variant="outline" size="sm" className="px-4 py-2 border-neutral-200">Metadata</Button>
            <Button variant="outline" size="sm" className="px-4 py-2 border-neutral-200">Export Raw</Button>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex bg-neutral-100 p-1">
            <button 
              onClick={() => setActiveTab('coding')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'coding' ? 'bg-black text-white' : 'text-neutral-400 hover:text-black'}`}
            >
              Transcript
            </button>
            <button 
              onClick={() => setActiveTab('report')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'report' ? 'bg-black text-white' : 'text-neutral-400 hover:text-black'}`}
            >
              Synthesis
            </button>
          </div>
          <button className="p-2 hover:bg-neutral-100 transition-colors">
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'coding' ? (
          <>
            <div className="flex-1 overflow-y-auto p-12 md:p-20 lg:p-32 border-r border-black bg-[#fcfcfc] no-scrollbar">
              <div className="max-w-3xl mx-auto space-y-24">
                <header className="mb-24 border-b border-black pb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <History size={14} className="opacity-30" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-300">Observation_Repository_Link</span>
                  </div>
                  <h3 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter mb-8 leading-[0.85]">{session.analysis?.summary}</h3>
                  <div className="flex gap-8">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-neutral-400 tracking-widest mb-1">Session_Date</span>
                      <span className="text-[10px] font-bold uppercase">{new Date(session.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-neutral-400 tracking-widest mb-1">Time_Signature</span>
                      <span className="text-[10px] font-bold uppercase">{new Date(session.date).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </header>

                <div className="space-y-20">
                  {session.analysis?.transcript.map((segment, idx) => (
                    <div key={idx} className="group relative">
                      <div className="flex items-center justify-between mb-6 border-b border-black/5 pb-2">
                        <div className="flex items-center gap-4">
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 ${segment.speaker === 'AI' ? 'bg-black text-white' : 'bg-neutral-100 text-black'}`}>
                            {segment.speaker}
                          </span>
                          <span className="text-[9px] font-mono text-neutral-400 font-bold">[{formatTime(segment.startTime || 0)}]</span>
                        </div>
                      </div>
                      
                      {renderSegmentText(segment.text, idx)}
                      
                      <div className="flex flex-wrap gap-2 mt-6">
                        {session.annotations
                          .filter(a => a.segmentIndex === idx)
                          .map(a => {
                            const code = session.codes.find(c => c.id === a.codeId);
                            return (
                              <div 
                                key={a.id}
                                className="group/anno px-3 py-1 text-[8px] font-black uppercase border border-black/10 flex items-center gap-3 hover:bg-black hover:text-white transition-all cursor-default"
                              >
                                <span>{code?.name}: "{a.text}"</span>
                                <X 
                                  size={10} 
                                  className="cursor-pointer opacity-0 group-hover/anno:opacity-100 hover:text-red-400" 
                                  onClick={() => onUpdate({ ...session, annotations: session.annotations.filter(an => an.id !== a.id) })} 
                                />
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selection && (
                <div 
                  className="fixed z-[100] bg-black text-white p-5 flex flex-col gap-4 min-w-[240px] shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-200"
                  style={{ top: selection.rect ? selection.rect.bottom + 12 : 0, left: selection.rect ? selection.rect.left : 0 }}
                >
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Apply Taxonomy</p>
                    <button onClick={() => setSelection(null)}><X size={12} /></button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">
                    {session.codes.length === 0 && (
                      <p className="text-[9px] font-bold text-neutral-500 uppercase italic">No themes defined</p>
                    )}
                    {session.codes.map(code => (
                      <button 
                        key={code.id} 
                        onClick={() => applyCode(code.id)} 
                        className="text-left text-[11px] font-bold uppercase py-1.5 px-3 hover:bg-white hover:text-black transition-colors flex items-center justify-between group/btn"
                      >
                        {code.name}
                        <ArrowRight size={10} className="opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[8px] font-mono opacity-40">SELECT_FRAGMENT: {selection.end - selection.start} chars</p>
                  </div>
                </div>
              )}
            </div>

            <aside className="w-96 p-12 bg-white overflow-y-auto no-scrollbar shadow-[-1px_0px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3 mb-10">
                <Layers size={16} className="text-black" />
                <h3 className="text-[12px] font-black uppercase tracking-[0.4em]">Thematic_Atlas</h3>
              </div>
              
              <div className="mb-16">
                <div className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    value={newCodeName}
                    onChange={(e) => setNewCodeName(e.target.value)}
                    placeholder="IDENTIFY NEW THEME..."
                    className="w-full bg-transparent border-b-2 border-black pb-3 text-[12px] font-bold outline-none uppercase tracking-widest placeholder:text-neutral-300"
                    onKeyDown={(e) => e.key === 'Enter' && addCode()}
                  />
                  <Button onClick={addCode} className="w-full" size="md">Catalog Theme</Button>
                </div>
              </div>

              <div className="space-y-10">
                {session.codes.map(code => {
                  const count = session.annotations.filter(a => a.codeId === code.id).length;
                  return (
                    <div key={code.id} className="flex flex-col gap-2 group">
                      <div className="flex justify-between items-end border-b border-black/10 pb-2 group-hover:border-black transition-colors">
                        <span className="text-[11px] font-black uppercase tracking-widest">{code.name}</span>
                        <span className="text-[10px] font-mono font-bold bg-neutral-100 px-2 py-0.5">{count}</span>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(Math.min(count, 10))].map((_, i) => (
                          <div key={i} className="h-1 flex-1 bg-black" />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-12 md:p-24 lg:p-40 bg-white no-scrollbar">
            <div className="max-w-5xl mx-auto space-y-40 pb-40">
              <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center gap-3 mb-12 opacity-30">
                  <FileText size={16} />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.6em]">Structural_Synthesis_v.1.0</h4>
                </div>
                <div className="relative">
                  <div className="absolute -left-12 top-0 bottom-0 w-2 bg-black" />
                  <p className="text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.85] italic">
                    "{session.analysis?.summary}"
                  </p>
                </div>
              </section>

              <div className="grid lg:grid-cols-2 gap-32">
                <section className="animate-in fade-in slide-in-from-bottom-12 duration-700 delay-100">
                  <div className="flex items-center gap-3 mb-12">
                    <Clock size={16} className="text-black" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em]">Diachronic_Mapping</h4>
                  </div>
                  <div className="space-y-20 relative">
                    <div className="absolute left-[7px] top-4 bottom-4 w-px bg-black opacity-10" />
                    {session.analysis?.diachronicStructure.map((phase, i) => (
                      <div key={i} className="group relative pl-10">
                        <div className="absolute left-0 top-1.5 w-[15px] h-[15px] bg-white border-2 border-black rounded-full z-10 group-hover:bg-black transition-colors" />
                        <div className="mb-4">
                          <span className="text-[9px] font-black mb-1 block opacity-30 tracking-[0.3em]">STAGE_0{i + 1}</span>
                          <h5 className="text-2xl font-black uppercase tracking-tight group-hover:translate-x-2 transition-transform">{phase.phaseName}</h5>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-neutral-500 max-w-md">{phase.description}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
                  <div className="flex items-center gap-3 mb-12">
                    <Layout size={16} className="text-black" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em]">Synchronic_Architecture</h4>
                  </div>
                  <div className="grid gap-6">
                    {session.analysis?.synchronicStructure.map((struct, i) => (
                      <div key={i} className="border-2 border-black/5 p-8 hover:border-black hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)] transition-all bg-[#fafafa]">
                        <div className="flex items-center gap-4 mb-6">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] bg-black text-white px-3 py-1">{struct.category}</span>
                        </div>
                        <p className="text-lg font-bold uppercase leading-tight tracking-tight">{struct.details}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="pt-24 border-t-4 border-black animate-in fade-in slide-in-from-bottom-12 duration-700 delay-300">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] mb-16">Phenomenological_Component_Registry</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-l border-t border-black">
                  {session.analysis?.modalities.map((m, i) => (
                    <div key={i} className="border-r border-b border-black p-8 flex flex-col gap-6 group hover:bg-black hover:text-white transition-colors">
                      <div className="w-10 h-10 border border-current flex items-center justify-center font-mono text-xs opacity-40">
                        0{i + 1}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">{m}</span>
                        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="pt-40 flex flex-col items-center opacity-10">
                <div className="text-[10px] font-black uppercase tracking-[1em] mb-4">End_Of_Report</div>
                <div className="w-64 h-px bg-black" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisView;
