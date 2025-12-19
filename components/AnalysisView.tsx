
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, Code, Annotation, InterviewSession } from '../types';
import { 
  BarChart3, 
  Code as CodeIcon, 
  MessageSquare, 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  ChevronRight, 
  X,
  History,
  Info
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
  const transcriptRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextSelection = (segmentIndex: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.anchorNode || !sel.focusNode) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Simple logic to map character offsets within the specific segment element
    // For production, this needs robust logic accounting for children and partial text nodes
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

    onUpdate({
      ...session,
      annotations: [...session.annotations, newAnnotation]
    });
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
    onUpdate({
      ...session,
      codes: [...session.codes, newCode]
    });
    setNewCodeName('');
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

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header with Audio Player */}
      <div className="bg-[#0047AB] text-white p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Analysis Workspace</h2>
            <p className="text-blue-100 text-sm">Session from {new Date(session.date).toLocaleString()}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-xl flex items-center gap-4 border border-white/10">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 bg-white text-[#0047AB] rounded-full flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
            </button>
            <div className="flex flex-col flex-1 min-w-[120px]">
              <div className="flex justify-between text-xs mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(session.duration)}</span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-300" 
                  style={{ width: `${(currentTime / session.duration) * 100}%` }} 
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={exportJson} className="bg-transparent text-white border-white hover:bg-white hover:text-[#0047AB]">
              <Download size={16} className="mr-2" /> Export
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-6 bg-slate-50">
        <button 
          onClick={() => setActiveTab('coding')}
          className={`px-6 py-4 font-semibold text-sm transition-all border-b-2 ${activeTab === 'coding' ? 'border-[#0047AB] text-[#0047AB]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <CodeIcon size={18} /> Coding Workspace
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          className={`px-6 py-4 font-semibold text-sm transition-all border-b-2 ${activeTab === 'report' ? 'border-[#0047AB] text-[#0047AB]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={18} /> AI Analysis Report
          </div>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'coding' ? (
          <>
            {/* Transcript Area */}
            <div className="flex-1 overflow-y-auto p-8 relative" ref={transcriptRef}>
              <div className="max-w-3xl mx-auto space-y-8">
                {session.analysis?.transcript.map((segment, idx) => (
                  <div key={idx} className="group relative">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${segment.speaker === 'AI' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        {segment.speaker}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">00:{idx * 15}</span>
                    </div>
                    <p 
                      onMouseUp={() => handleTextSelection(idx)}
                      className="text-lg leading-relaxed text-slate-800 font-light select-text relative"
                    >
                      {segment.text}
                    </p>
                    
                    {/* Render Annotations for this segment */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {session.annotations
                        .filter(a => a.segmentIndex === idx)
                        .map(a => {
                          const code = session.codes.find(c => c.id === a.codeId);
                          return (
                            <span 
                              key={a.id}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white flex items-center gap-1 group/annot"
                              style={{ backgroundColor: code?.color || '#94a3b8' }}
                            >
                              {code?.name}: "{a.text}"
                              <X size={10} className="cursor-pointer hover:scale-125" onClick={() => onUpdate({
                                ...session,
                                annotations: session.annotations.filter(an => an.id !== a.id)
                              })} />
                            </span>
                          );
                        })
                      }
                    </div>
                  </div>
                ))}
              </div>

              {/* Floating Hover Menu for Coding */}
              {selection && (
                <div 
                  className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 flex flex-col gap-1 min-w-[160px] animate-in zoom-in-95 duration-100"
                  style={{ 
                    top: selection.rect ? selection.rect.top - 80 : 0, 
                    left: selection.rect ? selection.rect.left : 0 
                  }}
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1">Apply Code</p>
                  <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
                    {session.codes.map(code => (
                      <button
                        key={code.id}
                        onClick={() => applyCode(code.id)}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors text-sm font-medium text-slate-700"
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: code.color }} />
                        {code.name}
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <button 
                    onClick={() => setSelection(null)}
                    className="w-full text-center py-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar for Code Management */}
            <div className="w-80 border-l border-slate-200 p-6 bg-slate-50 overflow-y-auto">
              <div className="mb-8">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CodeIcon size={18} className="text-[#0047AB]" /> Thematic Codes
                </h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newCodeName}
                    onChange={(e) => setNewCodeName(e.target.value)}
                    placeholder="New code..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0047AB] outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && addCode()}
                  />
                  <Button size="sm" onClick={addCode} className="px-3">+</Button>
                </div>
              </div>

              <div className="space-y-3">
                {session.codes.length === 0 ? (
                  <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl">
                    <CodeIcon size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-400">No thematic codes defined yet. Add one to start analysis.</p>
                  </div>
                ) : (
                  session.codes.map(code => (
                    <div key={code.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: code.color }} />
                        <span className="text-sm font-semibold text-slate-700">{code.name}</span>
                      </div>
                      <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {session.annotations.filter(a => a.codeId === code.id).length}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-8 bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Info size={14} /> Coding Guide
                </h4>
                <p className="text-xs text-blue-600 leading-relaxed">
                  Highlight text in the transcript to assign a thematic code. These labels help formalize the invariant structures of your participant's experience.
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Report View */
          <div className="flex-1 overflow-y-auto p-12 bg-slate-50">
            <div className="max-w-4xl mx-auto space-y-12">
              {/* Summary Section */}
              <section className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-3xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Executive Summary</h3>
                <p className="text-xl text-slate-700 leading-relaxed font-light italic">
                  "{session.analysis?.summary}"
                </p>
              </section>

              {/* Grid of Results */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <History size={20} className="text-[#0047AB]" /> Diachronic Dimension
                  </h4>
                  <div className="space-y-6">
                    {session.analysis?.diachronicStructure.map((phase, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0047AB] flex items-center justify-center text-xs font-bold shrink-0">
                            {i + 1}
                          </div>
                          {i < session.analysis!.diachronicStructure.length - 1 && (
                            <div className="w-0.5 h-full bg-slate-100 mt-2" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{phase.phaseName}</p>
                          <p className="text-sm text-slate-500 leading-relaxed">{phase.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <CodeIcon size={20} className="text-[#0047AB]" /> Synchronic Dimension
                  </h4>
                  <div className="space-y-4">
                    {session.analysis?.synchronicStructure.map((struct, i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-[#0047AB] uppercase tracking-widest mb-1">{struct.category}</p>
                        <p className="text-sm text-slate-700">{struct.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Modality Tags */}
              <div className="flex flex-wrap gap-3 pt-6">
                {session.analysis?.modalities.map((m, i) => (
                  <span key={i} className="px-4 py-2 bg-white rounded-full border border-slate-200 text-sm font-semibold text-slate-600 shadow-sm flex items-center gap-2">
                    <ChevronRight size={14} className="text-[#0047AB]" />
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisView;
