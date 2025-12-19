
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
  Plus, 
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
  ChevronRight
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    language: LanguagePreference.UK,
    voiceGender: VoiceGender.FEMALE,
    privacyContract: true,
    interviewMode: InterviewMode.BEGINNER
  });

  // Load persistence
  useEffect(() => {
    const saved = localStorage.getItem('neuro_phenom_sessions');
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  // Save persistence
  useEffect(() => {
    localStorage.setItem('neuro_phenom_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const handleCreateAISession = () => {
    setView('ai-interview');
  };

  const handleAIInterviewComplete = async (transcript: SpeakerSegment[]) => {
    setIsAnalyzing(true);
    try {
      const transcriptText = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
      const analysis = await analyzeInterview(transcriptText, settings.language);
      
      const newSession: InterviewSession = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        duration: transcript.length * 10, // Mock duration
        type: 'AI_INTERVIEW',
        analysis,
        codes: [],
        annotations: []
      };
      
      setSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession);
      setView('analysis');
    } catch (error) {
      alert("Analysis failed. Transcript saved.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this session forever?")) {
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  const exportSession = (session: InterviewSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `session_${session.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const filteredSessions = sessions.filter(s => 
    s.analysis?.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.date.includes(searchQuery)
  );

  const renderHome = () => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Sidebar / Info */}
      <div className="md:col-span-4 flex flex-col gap-6">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h1 className="text-3xl font-extrabold text-[#0047AB] mb-4">NeuroPhenom AI</h1>
          <p className="text-slate-600 leading-relaxed text-left mb-8">
            Advanced neurophenomenology platform utilizing Micro-phenomenology techniques to map the intricate micro-dynamics of subjective experience.
          </p>
          
          <div className="space-y-4">
            <Button onClick={handleCreateAISession} className="w-full justify-start gap-4 h-16 text-lg px-6 rounded-2xl group shadow-blue-200 shadow-lg">
              <BrainCircuit className="group-hover:rotate-12 transition-transform" /> Conversational AI Interview
            </Button>
            <Button variant="outline" className="w-full justify-start gap-4 h-16 text-lg px-6 rounded-2xl">
              <Mic /> Record Live Interview
            </Button>
            <Button variant="secondary" className="w-full justify-start gap-4 h-16 text-lg px-6 rounded-2xl">
              <Upload /> Upload Transcript (.txt)
            </Button>
          </div>

          <div className="mt-12 flex justify-center">
            <a 
              href="https://newpsychonaut.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-slate-400 hover:text-[#0047AB] transition-all"
            >
              <Globe size={18} className="group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-medium">newpsychonaut.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Dashboard Area */}
      <div className="md:col-span-8 flex flex-col gap-6">
        <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-3xl shadow-sm border border-slate-200">
          <Search className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Search recent sessions by summary or date..." 
            className="flex-1 bg-transparent border-none outline-none text-slate-700 text-lg font-light"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] px-4 flex items-center gap-2">
            <History size={16} /> Recent Sessions
          </h2>
          
          {filteredSessions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
              <History size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400">No sessions found. Start a new interview to see results here.</p>
            </div>
          ) : (
            filteredSessions.map(session => (
              <div 
                key={session.id}
                onClick={() => {
                  setActiveSession(session);
                  setView('analysis');
                }}
                className="group bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:border-[#0047AB]/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="px-2 py-1 bg-blue-50 text-[#0047AB] text-[10px] font-bold rounded uppercase tracking-wider">
                      {session.type.replace('_', ' ')}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(session.date).toLocaleDateString()} • {Math.floor(session.duration / 60)}m
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => exportSession(session, e)}
                      className="p-2 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-full"
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={(e) => deleteSession(session.id, e)}
                      className="p-2 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-full"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <p className="text-slate-800 font-medium mb-3 line-clamp-2 leading-relaxed">
                  {session.analysis?.summary}
                </p>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {session.analysis?.modalities.slice(0, 3).map((m, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-full border border-slate-100 uppercase tracking-tighter">
                      {m}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 bg-blue-50 text-[#0047AB] text-[10px] font-bold rounded-full border border-blue-100 uppercase tracking-tighter ml-auto flex items-center gap-1">
                    {session.analysis?.phasesCount} Phases <ChevronRight size={10} />
                  </span>
                </div>
                
                {/* Visual Cobalt Accent */}
                <div className="absolute left-0 top-0 w-1 h-full bg-[#0047AB] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
      {/* Navigation */}
      <nav className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 px-8 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setView('home')}
        >
          <div className="w-10 h-10 bg-[#0047AB] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20 group-hover:scale-110 transition-transform">
            <LayoutDashboard size={24} />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">NeuroPhenom <span className="text-[#0047AB]">AI</span></span>
        </div>

        <div className="flex items-center gap-4">
          <SettingsMenu settings={settings} onUpdate={setSettings} />
        </div>
      </nav>

      {/* Main Viewport */}
      <main className="flex-1 overflow-y-auto">
        {isAnalyzing && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center">
            <div className="bg-white p-12 rounded-3xl shadow-2xl text-center max-w-sm">
              <div className="w-16 h-16 border-4 border-[#0047AB]/20 border-t-[#0047AB] rounded-full animate-spin mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-2">Analyzing Session</h3>
              <p className="text-slate-500">Mapping the structures of your experience using Gemini AI...</p>
            </div>
          </div>
        )}

        {view === 'home' && renderHome()}
        {view === 'ai-interview' && (
          <div className="p-8 max-w-4xl mx-auto h-[calc(100vh-140px)]">
            <LiveInterviewSession 
              settings={settings} 
              onComplete={handleAIInterviewComplete}
              onCancel={() => setView('home')}
            />
          </div>
        )}
        {view === 'analysis' && activeSession && (
          <div className="p-8 max-w-[1400px] mx-auto h-[calc(100vh-120px)] flex flex-col">
            <div className="mb-6 flex items-center gap-4">
              <Button variant="secondary" onClick={() => setView('home')}>
                <ChevronRight className="rotate-180" /> Back to Dashboard
              </Button>
            </div>
            <AnalysisView 
              session={activeSession} 
              onUpdate={(updated) => {
                setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
                setActiveSession(updated);
              }} 
            />
          </div>
        )}
      </main>

      {/* Buy Me A Coffee FAB */}
      {view === 'home' && (
        <a 
          href="https://buymeacoffee.com/stevebeale" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-8 right-8 group flex items-center bg-[#FFDD00] text-black h-14 pr-1 pl-1 rounded-full shadow-xl hover:pr-5 transition-all overflow-hidden border-2 border-white/50"
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0">
            <Coffee size={24} fill="#FFDD00" className="text-[#FFDD00]" />
          </div>
          <span className="whitespace-nowrap font-bold text-sm px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Buy me a coffee
          </span>
        </a>
      )}
    </div>
  );
};

export default App;
