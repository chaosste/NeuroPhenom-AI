
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, Code, Annotation, InterviewSession } from '../types';
import { 
  BarChart3, 
  Code as CodeIcon, 
  Play, 
  Pause, 
  Download, 
  X,
  History,
  Info,
  ChevronRight,
  Quote,
  Clock,
  FileText,
  CheckCircle2,
  Plus
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
  const [inlineNewCodeName, setInlineNewCodeName] = useState('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

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
    if (!sel || sel.isCollapsed || !sel.anchorNode || !sel.focusNode) {
      setSelection(null);
      return;
    }

    const segment = session.analysis?.transcript[segmentIndex];
    if (segment && segment.startTime !== undefined && audioRef.current) {
      audioRef.current.currentTime = segment.startTime;
      setCurrentTime(segment.startTime);
    }

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

  const addInlineCode = () => {
    if (!inlineNewCodeName.trim() || !selection) return;
    const newCode: Code = {
      id: crypto.randomUUID(),
      name: inlineNewCodeName,
      color: COLORS.codeColors[session.codes.length % COLORS.codeColors.length]
    };
    const updatedCodes = [...session.codes, newCode];
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      codeId: newCode.id,
      segmentIndex: selection.segmentIndex,
      startOffset: selection.start,
      endOffset: selection.end,
      text: session.analysis?.transcript[selection.segmentIndex].text.substring(selection.start, selection.end) || ''
    };
    onUpdate({ ...session, codes: updatedCodes, annotations: [...session.annotations, newAnnotation] });
    setSelection(null);
    setInlineNewCodeName('');
    window.getSelection()?.removeAllRanges();
  };

  const exportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `session_${session.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportTranscriptTxt = () => {
    if (!session.analysis?.transcript) return;
    const text = session.analysis.transcript.map(segment => {
      const time = formatTime(segment.startTime || 0);
      return `[${time}] ${segment.speaker}: ${segment.text}`;
    }).join('\n\n');
    
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `transcript_${session.id}.txt`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={session.audioUrl} />

      {/* Header Area */}
      <div className="bg-[#0047AB] text-white p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <History size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Phenomenological Workspace</h2>
              <p className="text-blue-100 text-sm font-medium opacity-80">
                {new Date(session.date).toLocaleString()} • {formatTime(session.duration)} total duration
              </p>
            </div>
          </div>
          
          <div className="bg-slate-900/30 p-4 rounded-2xl flex items-center gap-6 border border-white/10 backdrop-blur-xl">
            <button 
              onClick={togglePlayback}
              className="w-12 h-12 bg-white text-[#0047AB] rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <div className="flex flex-col flex-1 min-w-[160px]">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(session.duration)}</span>
              </div>
              <input 
                type="range"
                min="0"
                max={session.duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  if (audioRef.current) audioRef.current.currentTime = time;
                  setCurrentTime(time);
                }}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportTranscriptTxt} title="Export Transcript (.txt)" className="bg-white/10 text-white border-white/20 hover:bg-white hover:text-[#0047AB] transition-all">
                <FileText size={18} />
              </Button>
              <Button variant="outline" size="sm" onClick={exportJson} className="bg-white/10 text-white border-white/20 hover:bg-white hover:text-[#0047AB] transition-all">
                <Download size={18} className="mr-2" /> Export JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 px-8 bg-slate-50/50">
        {[
          { id: 'coding', label: 'Coding Workspace', icon: CodeIcon },
          { id: 'report', label: 'AI Synthesis Report', icon: BarChart3 }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-5 font-bold text-sm transition-all border-b-2 flex items-center gap-3 ${activeTab === tab.id ? 'border-[#0047AB] text-[#0047AB]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <tab.icon size={20} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'coding' ? (
          <>
            <div className="flex-1 overflow-y-auto p-12 bg-white scroll-smooth" ref={transcriptRef}>
              <div className="max-w-3xl mx-auto space-y-12">
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4 mb-8">
                  <Info className="text-blue-500 mt-1 shrink-0" size={20} />
                  <p className="text-sm text-blue-700 leading-relaxed">
                    <strong>Tip:</strong> Selecting text will automatically jump the audio player to that segment's timestamp. Use the right sidebar or the selection menu to define thematic codes.
                  </p>
                </div>

                {session.analysis?.transcript.map((segment, idx) => (
                  <div 
                    key={idx} 
                    className={`group relative p-4 rounded-xl transition-colors hover:bg-slate-50 cursor-pointer ${Math.abs(currentTime - (segment.startTime || 0)) < 5 ? 'bg-blue-50/30' : ''}`}
                    onClick={() => {
                      if (segment.startTime !== undefined && audioRef.current) {
                        audioRef.current.currentTime = segment.startTime;
                        setCurrentTime(segment.startTime);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${segment.speaker === 'AI' ? 'bg-[#0047AB] text-white shadow-sm' : 'bg-slate-800 text-white shadow-sm'}`}>
                          {segment.speaker}
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-xs">
                          <Clock size={12} /> {formatTime(segment.startTime || idx * 10)}
                        </div>
                      </div>
                    </div>
                    <p 
                      onMouseUp={() => handleTextSelection(idx)}
                      className="text-xl leading-relaxed text-slate-800 font-light select-text"
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
                              className="px-3 py-1 rounded-lg text-[11px] font-bold text-white flex items-center gap-2 shadow-sm animate-in zoom-in-95"
                              style={{ backgroundColor: code?.color || '#94a3b8' }}
                            >
                              {code?.name}
                              <X size={12} className="cursor-pointer hover:scale-125" onClick={(e) => {
                                e.stopPropagation();
                                onUpdate({ ...session, annotations: session.annotations.filter(an => an.id !== a.id) });
                              }} />
                            </span>
                          );
                        })
                      }
                    </div>
                  </div>
                ))}
              </div>

              {/* Selection Menu */}
              {selection && (
                <div 
                  className="fixed z-[100] bg-slate-900 text-white rounded-xl shadow-2xl p-3 flex flex-col gap-2 min-w-[240px] border border-white/10 animate-in zoom-in-95"
                  style={{ top: selection.rect ? selection.rect.bottom + 10 : 0, left: selection.rect ? selection.rect.left : 0 }}
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 py-1 border-b border-white/5 mb-1">Apply or Create Code</p>
                  
                  <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                    {session.codes.map(code => (
                      <button
                        key={code.id}
                        onClick={() => applyCode(code.id)}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-xs font-bold"
                      >
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: code.color }} />
                        <span className="truncate">{code.name}</span>
                      </button>
                    ))}
                    {session.codes.length === 0 && <p className="text-[10px] text-slate-500 italic px-3 py-2">No codes yet...</p>}
                  </div>

                  <div className="border-t border-white/5 pt-2 mt-1">
                    <div className="flex gap-1">
                      <input 
                        type="text"
                        value={inlineNewCodeName}
                        onChange={(e) => setInlineNewCodeName(e.target.value)}
                        placeholder="New code..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        onKeyDown={(e) => e.key === 'Enter' && addInlineCode()}
                      />
                      <button 
                        onClick={addInlineCode}
                        className="bg-blue-600 hover:bg-blue-500 p-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelection(null)} 
                    className="w-full text-center py-2 text-[10px] text-slate-500 hover:text-white transition-colors uppercase font-black tracking-tighter"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <aside className="w-80 border-l border-slate-200 p-8 bg-slate-50/50 overflow-y-auto">
              <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
                <CodeIcon size={18} className="text-[#0047AB]" /> Thematic Taxonomy
              </h3>
              <div className="flex gap-2 mb-8">
                <input 
                  type="text" 
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value)}
                  placeholder="Create new code..."
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0047AB] outline-none shadow-sm"
                  onKeyDown={(e) => e.key === 'Enter' && addCode()}
                />
                <Button onClick={addCode} className="px-4 shadow-md">+</Button>
              </div>

              <div className="space-y-4">
                {session.codes.length === 0 ? (
                  <div className="text-center py-16 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                    <CodeIcon size={40} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-sm text-slate-400 font-medium">No codes defined. Highlight transcript text to begin thematic grouping.</p>
                  </div>
                ) : (
                  session.codes.map(code => (
                    <div key={code.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-[#0047AB]/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: code.color }} />
                        <span className="text-sm font-bold text-slate-700">{code.name}</span>
                      </div>
                      <span className="bg-slate-100 text-slate-500 text-[10px] px-2.5 py-1 rounded-full font-black">
                        {session.annotations.filter(a => a.codeId === code.id).length}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-12 bg-slate-50/30">
            <div className="max-w-4xl mx-auto space-y-16">
              {/* Executive Summary - Improved Top Section */}
              <section className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-slate-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />
                <h3 className="text-[10px] font-black text-[#0047AB] mb-8 uppercase tracking-[0.4em] flex items-center gap-3">
                  <Quote size={24} fill="#0047AB" /> AI Executive Synthesis
                </h3>
                <p className="text-3xl font-light text-slate-800 leading-tight italic tracking-tight relative z-10">
                  "{session.analysis?.summary}"
                </p>
                
                <div className="mt-16 pt-10 border-t border-slate-100 relative z-10">
                  <h4 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#0047AB]" /> Key Structural Takeaways
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {session.analysis?.takeaways.map((t, i) => (
                      <div key={i} className="flex gap-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-blue-50 hover:border-blue-100 transition-all">
                        <div className="w-6 h-6 rounded-full bg-[#0047AB] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                          {i + 1}
                        </div>
                        <p className="text-sm font-semibold text-slate-600 leading-relaxed">{t}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Structural Dimensions */}
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-3 uppercase tracking-widest border-b border-slate-200 pb-4">
                    <History size={20} className="text-[#0047AB]" /> Diachronic Structures
                  </h4>
                  <div className="space-y-10">
                    {session.analysis?.diachronicStructure.map((phase, i) => (
                      <div key={i} className="flex gap-6 relative">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-2xl bg-[#0047AB] text-white flex items-center justify-center text-sm font-black shrink-0 shadow-lg shadow-blue-500/30">
                            {i + 1}
                          </div>
                          {i < session.analysis!.diachronicStructure.length - 1 && (
                            <div className="w-0.5 h-full bg-slate-200 my-2" />
                          )}
                        </div>
                        <div className="pt-1">
                          <p className="text-lg font-bold text-slate-900 mb-2">{phase.phaseName}</p>
                          <p className="text-sm text-slate-500 leading-relaxed font-medium">{phase.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-3 uppercase tracking-widest border-b border-slate-200 pb-4">
                    <CodeIcon size={20} className="text-[#0047AB]" /> Synchronic Qualities
                  </h4>
                  <div className="grid gap-4">
                    {session.analysis?.synchronicStructure.map((struct, i) => (
                      <div key={i} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-[#0047AB]/30 transition-all">
                        <p className="text-[10px] font-black text-[#0047AB] uppercase tracking-[0.2em] mb-2">{struct.category}</p>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{struct.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Modality Context */}
              <div className="pt-10 border-t border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Experience Modalities Identified</p>
                <div className="flex flex-wrap gap-4">
                  {session.analysis?.modalities.map((m, i) => (
                    <span key={i} className="px-6 py-3 bg-white rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 shadow-sm flex items-center gap-3 hover:shadow-md transition-all cursor-default">
                      <ChevronRight size={16} className="text-[#0047AB]" />
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisView;
