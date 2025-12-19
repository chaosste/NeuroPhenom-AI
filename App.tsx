
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
  Upload, 
  Mic, 
  Globe, 
  Coffee, 
  Trash2,
  Download,
  ChevronRight,
  Filter,
  ArrowRight,
  MessageSquare,
  FileText
} from 'lucide-react';
import LiveInterviewSession from './components/LiveInterviewSession';
import AnalysisView from './components/AnalysisView';
import SettingsMenu from './components/SettingsMenu';
import Button from './components/Button';
import { analyzeInterview } from './services/geminiService';
import { Artifact } from './constants';

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

  useEffect(() => {
    const savedSessions = localStorage.getItem('neuro_phenom_sessions');
    if (savedSessions) {
      try { setSessions(JSON.parse(savedSessions)); } catch (e) {}
    }
    const savedSettings = localStorage.getItem('neuro_phenom_settings');
    if (savedSettings) {
      try { setSettings(JSON.parse(savedSettings)); } catch (e) {}
    }
  }, []);

  useEffect(() => { localStorage.setItem('neuro_phenom_sessions', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem('neuro_phenom_settings', JSON.stringify(settings)); }, [settings]);

  const handleCreateAISession = () => setView('ai-interview');

  const handleAIInterviewComplete = async (transcript: SpeakerSegment[]) => {
    if (transcript.length === 0) { setView('home'); return; }
    setIsAnalyzing(true);
    try {
      const transcriptText = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
      const analysis = await analyzeInterview(transcriptText, settings.language);
      const duration = transcript.length > 0 ? (transcript[transcript.length - 1].startTime || transcript.length * 5) : 0;
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
      alert("AI analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("DELETE REPOSITORY?")) {
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSession?.id === id) { setView('home'); setActiveSession(null); }
    }
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.analysis?.summary.toLowerCase().includes(searchQuery.toLowerCase()) || s.date.includes(searchQuery);
    const matchesType = typeFilter === 'ALL' || s.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const renderHome = () => (
    <div className="flex flex-col gap-0 animate-in fade-in duration-300 max-w-7xl mx-auto w-full p-8 md:p-12">
      {/* Header Info */}
      <div className="mb-12 border-b border-black pb-12">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 uppercase flex items-center gap-4">
          <div className="w-12 h-12 bg-black flex items-center justify-center p-2">
            <Artifact className="text-white w-full h-full" />
          </div>
          NeuroPhenom AI
        </h1>
        <p className="text-lg font-medium max-w-2xl tracking-tight leading-snug opacity-70">
          Professional neurophenomenology platform using Micro-phenomenology techniques and Gemini AI to map the micro-dynamics of subjective experience. Record sessions, automatically codify diachronic and synchronic structures, and explore the depths of lived experience.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Actions Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Main Conversational AI Card */}
          <div className="bg-black text-white p-8 flex flex-col gap-8 min-h-[300px]">
            <div className="w-12 h-12 border border-white/20 flex items-center justify-center">
              <MessageSquare size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Conversational AI</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-6">Interactive Guide • {settings.language} Voice</p>
              <Button 
                onClick={handleCreateAISession} 
                variant="secondary" 
                size="md" 
                className="w-fit group"
              >
                Start Session <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Secondary Action Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-black p-6 flex flex-col gap-6 group hover:bg-neutral-50 transition-colors cursor-not-allowed opacity-50">
              <div className="w-10 h-10 border border-black/10 flex items-center justify-center">
                <Mic size={18} className="text-black" />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">Record Interview</h4>
                <p className="text-[9px] font-bold uppercase tracking-widest flex items-center text-black">
                  Record <ChevronRight size={10} className="ml-1" />
                </p>
              </div>
            </div>

            <div className="border border-black p-6 flex flex-col gap-6 group hover:bg-neutral-50 transition-colors cursor-not-allowed opacity-50">
              <div className="w-10 h-10 border border-black/10 flex items-center justify-center">
                <FileText size={18} className="text-black" />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">Analyze Text</h4>
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest flex items-center text-black">
                    Upload <Upload size={10} className="ml-1" />
                  </p>
                  <span className="text-[8px] font-mono opacity-40">.txt file</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sessions Column */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-black pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black uppercase tracking-tight">Recent Sessions</h2>
              <span className="bg-neutral-100 text-[10px] font-black px-2 py-0.5 border border-black/5">{filteredSessions.length}</span>
            </div>
            <div className="flex items-center border border-black/20 px-3 py-1.5 w-full md:w-64 bg-neutral-50">
              <Search size={14} className="mr-2 opacity-30" />
              <input 
                type="text" 
                placeholder="Search sessions..." 
                className="bg-transparent outline-none uppercase text-[10px] font-bold tracking-widest w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-black/10 bg-neutral-50/50">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Archive Empty</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[800px] pr-2 no-scrollbar">
              {filteredSessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => { setActiveSession(session); setView('analysis'); }}
                  className="group border border-black p-6 hover:bg-black hover:text-white transition-all cursor-pointer flex flex-col gap-4 relative"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <FileText size={14} className="opacity-30" />
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                        {new Date(session.date).toLocaleDateString()} • {session.type.replace('_', ' ')}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => deleteSession(session.id, e)} 
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-bold uppercase tracking-tight leading-tight line-clamp-2">
                    {session.analysis?.summary || "Exploration"}
                  </h3>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[8px] font-black uppercase border border-current px-2 py-0.5 opacity-50">
                      {session.analysis?.phasesCount || 0} Phases
                    </span>
                    {session.analysis?.modalities.map((m, i) => (
                      <span key={i} className="text-[8px] font-black uppercase border border-current px-2 py-0.5 opacity-50">
                        {m}
                      </span>
                    ))}
                  </div>

                  <ArrowRight size={16} className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="mt-24 p-12 border-t border-black flex flex-col items-center gap-8">
        <a href="https://newpsychonaut.com" target="_blank" className="text-[10px] font-black uppercase tracking-[0.5em] hover:opacity-50 transition-opacity">NewPsychonaut.com</a>
        <div className="flex gap-12 opacity-40">
          <Artifact className="h-8 w-8 text-black" />
          <div className="w-px h-8 bg-black/20" />
          <Artifact className="h-8 w-8 text-black transform rotate-180" />
        </div>
      </footer>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans selection:bg-black selection:text-white">
      <header className="h-20 border-b border-black px-8 flex items-center justify-between sticky top-0 z-50 bg-white">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-8 h-8 bg-black flex items-center justify-center p-1.5 overflow-hidden">
            <Artifact className="w-full h-full text-white" />
          </div>
          <span className="text-lg font-black tracking-tighter uppercase">NeuroPhenom AI</span>
        </div>
        <div className="flex items-center gap-4">
          <SettingsMenu settings={settings} onUpdate={setSettings} />
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {isAnalyzing && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="text-center animate-pulse">
              <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin mx-auto mb-8" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Extracting Structure</h3>
            </div>
          </div>
        )}

        <div className="flex-1">
          {view === 'home' && renderHome()}
          {view === 'ai-interview' && (
            <div className="p-0 h-[calc(100vh-80px)]">
              <LiveInterviewSession 
                settings={settings} 
                onComplete={handleAIInterviewComplete}
                onCancel={() => setView('home')}
              />
            </div>
          )}
          {view === 'analysis' && activeSession && (
            <div className="p-0 h-[calc(100vh-80px)] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
              <AnalysisView 
                session={activeSession} 
                onUpdate={(updated) => {
                  setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
                  setActiveSession(updated);
                }} 
              />
            </div>
          )}
        </div>
      </main>

      {view === 'home' && (
        <div className="fixed bottom-8 right-8 z-50 flex gap-4">
          <a href="https://buymeacoffee.com/stevebeale" target="_blank" className="w-12 h-12 bg-black text-white flex items-center justify-center hover:scale-105 transition-transform shadow-xl">
            <Coffee size={20} />
          </a>
        </div>
      )}
    </div>
  );
};

export default App;
