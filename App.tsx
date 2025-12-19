
import React, { useState, useEffect } from 'react';
import { 
  InterviewSession, 
  Settings, 
  LanguagePreference, 
  VoiceGender, 
  InterviewMode, 
  SpeakerSegment 
} from './types';
import { 
  Search, 
  History, 
  LayoutDashboard, 
  BrainCircuit, 
  Upload, 
  Mic, 
  Globe, 
  Coffee, 
  Trash2,
  Download,
  ChevronRight,
  Filter,
  Layers
} from 'lucide-react';
import LiveInterviewSession from './components/LiveInterviewSession';
import AnalysisView from './components/AnalysisView';
import SettingsMenu from './components/SettingsMenu';
import Button from './components/Button';
import { analyzeInterview } from './services/geminiService';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [view, setView] = useState<'home' | 'ai-interview' | 'analysis'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'AI_INTERVIEW' | 'RECORDED' | 'UPLOADED'>('ALL');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    language: LanguagePreference.UK,
    voiceGender: VoiceGender.FEMALE,
    privacyContract: true,
    interviewMode: InterviewMode.BEGINNER
  });

  // Load persistence (Sessions & Settings)
  useEffect(() => {
    const savedSessions = localStorage.getItem('neuro_phenom_sessions');
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
    const savedSettings = localStorage.getItem('neuro_phenom_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  // Save persistence (Sessions)
  useEffect(() => {
    localStorage.setItem('neuro_phenom_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Save persistence (Settings)
  useEffect(() => {
    localStorage.setItem('neuro_phenom_settings', JSON.stringify(settings));
  }, [settings]);

  const handleCreateAISession = () => {
    setView('ai-interview');
  };

  const handleAIInterviewComplete = async (transcript: SpeakerSegment[]) => {
    if (transcript.length === 0) {
      setView('home');
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const transcriptText = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
      const analysis = await analyzeInterview(transcriptText, settings.language);
      
      // Calculate actual duration from last segment's timestamp
      const duration = transcript.length > 0 
        ? (transcript[transcript.length - 1].startTime || transcript.length * 5) 
        : 0;

      const newSession: InterviewSession = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        duration,
        type: 'AI_INTERVIEW',
        analysis,
        codes: [],
        annotations: []
      };
      
      setSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession);
      setView('analysis');
    } catch (error) {
      console.error("Analysis failed", error);
      alert("AI analysis failed. Your transcript was saved but structural mapping was not completed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSession?.id === id) {
        setView('home');
        setActiveSession(null);
      }
    }
  };

  const exportSession = (session: InterviewSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `NeuroPhenom_Session_${session.id.substring(0, 8)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.analysis?.summary.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.date.includes(searchQuery);
    const matchesType = typeFilter === 'ALL' || s.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const renderHome = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Sidebar / Info */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#0047AB] rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Layers size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">NeuroPhenom</h1>
          </div>
          
          <p className="text-slate-600 leading-relaxed mb-8 text-lg font-light">
            A high-fidelity platform for <span className="text-[#0047AB] font-semibold">Micro-phenomenology</span>. Bridge subjective experience and structural neuro-dynamics using Gemini AI.
          </p>
          
          <div className="space-y-4">
            <Button 
              onClick={handleCreateAISession} 
              className="w-full justify-start gap-4 h-16 text-lg px-6 rounded-2xl group shadow-blue-200 shadow-xl transition-all hover:scale-[1.02]"
            >
              <BrainCircuit className="group-hover:rotate-12 transition-transform shrink-0" /> 
              <span>AI Elicitation Interview</span>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-4 h-16 text-lg px-6 rounded-2xl opacity-60 cursor-not-allowed grayscale">
              <Mic className="shrink-0" /> 
              <span>Live Observer Mode</span>
            </Button>
            <Button variant="secondary" className="w-full justify-start gap-4 h-16 text-lg px-6 rounded-2xl opacity-60 cursor-not-allowed grayscale">
              <Upload className="shrink-0" /> 
              <span>Import Metadata (.json)</span>
            </Button>
          </div>

          <div className="mt-12 flex flex-col items-center gap-4">
            <a 
              href="https://newpsychonaut.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-slate-400 hover:text-[#0047AB] transition-all"
            >
              <Globe size={18} className="group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-semibold tracking-tight uppercase">Visit NewPsychonaut.com</span>
            </a>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Version 1.2.4 Deployment</p>
          </div>
        </div>
      </div>

      {/* Main Dashboard Area */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 bg-white px-6 py-5 rounded-3xl shadow-sm border border-slate-200">
            <Search className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search repositories by synthesis or date..." 
              className="flex-1 bg-transparent border-none outline-none text-slate-700 text-lg font-light placeholder:text-slate-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 px-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
            <div className="text-slate-400 mr-2 flex items-center gap-1 shrink-0">
              <Filter size={14} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Repository Filter:</span>
            </div>
            {(['ALL', 'AI_INTERVIEW', 'RECORDED', 'UPLOADED'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${typeFilter === type ? 'bg-[#0047AB] text-white border-[#0047AB] shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-20">
          <div className="flex justify-between items-center px-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <History size={16} className="text-[#0047AB]" /> Subjective Repositories
            </h2>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filteredSessions.length} sessions</span>
          </div>
          
          {filteredSessions.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-16 text-center border-2 border-dashed border-slate-100">
              <History size={48} className="mx-auto text-slate-100 mb-6" />
              <p className="text-slate-400 font-medium max-w-xs mx-auto">The repository is currently empty. Initiate an elicitation to map your first experience.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredSessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => {
                    setActiveSession(session);
                    setView('analysis');
                  }}
                  className="group bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:border-[#0047AB]/50 hover:shadow-xl hover:shadow-blue-900/5 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 bg-blue-50 text-[#0047AB] text-[10px] font-black rounded uppercase tracking-[0.1em]">
                        {session.type.replace('_', ' ')}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        {new Date(session.date).toLocaleDateString()} • {Math.ceil(session.duration / 60)}m
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={(e) => exportSession(session, e)}
                        className="p-2 hover:bg-blue-50 text-slate-400 hover:text-[#0047AB] rounded-full transition-colors"
                        title="Export JSON"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={(e) => deleteSession(session.id, e)}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                        title="Delete Repository"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-800 font-semibold mb-4 line-clamp-2 leading-snug h-12">
                    {session.analysis?.summary || "Exploration Session"}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {session.analysis?.modalities.slice(0, 3).map((m, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-black rounded-lg border border-slate-100 uppercase tracking-tight">
                        {m}
                      </span>
                    ))}
                    <span className="px-2.5 py-1 bg-[#0047AB] text-white text-[9px] font-black rounded-lg ml-auto flex items-center gap-1 uppercase tracking-widest shadow-sm">
                      {session.analysis?.phasesCount} Phases <ChevronRight size={10} />
                    </span>
                  </div>
                  
                  {/* Cobalt Highlight Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#0047AB] to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-[#0047AB]">
      {/* Navigation */}
      <header className="h-20 bg-white/80 backdrop-blur-xl sticky top-0 z-[60] border-b border-slate-200 px-8 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setView('home')}
        >
          <div className="w-10 h-10 bg-[#0047AB] rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-900/20 group-hover:rotate-6 transition-all">
            <Layers size={22} />
          </div>
          <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">
            NeuroPhenom <span className="text-[#0047AB]">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <SettingsMenu settings={settings} onUpdate={setSettings} />
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {isAnalyzing && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-2xl z-[100] flex items-center justify-center animate-in fade-in duration-300">
            <div className="bg-white p-16 rounded-[3rem] shadow-[0_0_100px_rgba(0,71,171,0.2)] text-center max-w-sm border border-white/20">
              <div className="relative mb-8">
                <div className="w-20 h-20 border-4 border-[#0047AB]/10 border-t-[#0047AB] rounded-full animate-spin mx-auto" />
                <BrainCircuit className="absolute inset-0 m-auto text-[#0047AB] animate-pulse" size={32} />
              </div>
              <h3 className="text-3xl font-black mb-4 tracking-tight">Mapping Consciousness</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                Gemini is extracting the invariant diachronic and synchronic structures of your experience...
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {view === 'home' && renderHome()}
          {view === 'ai-interview' && (
            <div className="p-4 md:p-12 max-w-5xl mx-auto h-[calc(100vh-120px)] animate-in slide-in-from-bottom-8 duration-700">
              <LiveInterviewSession 
                settings={settings} 
                onComplete={handleAIInterviewComplete}
                onCancel={() => setView('home')}
              />
            </div>
          )}
          {view === 'analysis' && activeSession && (
            <div className="p-4 md:p-8 max-w-[1500px] mx-auto h-[calc(100vh-100px)] flex flex-col animate-in zoom-in-95 duration-500">
              <div className="mb-6 flex items-center justify-between">
                <Button variant="outline" onClick={() => setView('home')} className="gap-2 bg-white border-slate-200 text-slate-600 hover:text-slate-900">
                  <ChevronRight className="rotate-180" size={18} /> Back to Repository
                </Button>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                    ID: {activeSession.id.substring(0, 8)}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <AnalysisView 
                  session={activeSession} 
                  onUpdate={(updated) => {
                    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
                    setActiveSession(updated);
                  }} 
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Persistence / App Info Overlay */}
      {view === 'home' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 bg-white/50 backdrop-blur-md rounded-full border border-slate-200 shadow-xl shadow-slate-900/5 opacity-80 hover:opacity-100 transition-opacity z-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Local Persistence Active</span>
          </div>
          <div className="h-4 w-px bg-slate-300" />
          <a 
            href="https://buymeacoffee.com/stevebeale" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-600 hover:text-[#FFDD00] transition-colors"
          >
            <Coffee size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Support the research</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default App;
