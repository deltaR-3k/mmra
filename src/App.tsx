import { useState, useEffect, useRef } from 'react';
import { translateToSlang, fetchModels, APIProvider, Tone } from './services/translator';

// Types
interface HistoryItem {
  id: string;
  original: string;
  translated: string;
  tone: Tone;
  timestamp: number;
}

function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Settings State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('rt_api_key') || '');
  const [provider, setProvider] = useState<APIProvider>(() => (localStorage.getItem('rt_provider') as APIProvider) || 'openai');
  const [model, setModel] = useState(() => localStorage.getItem('rt_model') || '');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // UI State
  const [tone, setTone] = useState<Tone>(() => (localStorage.getItem('rt_tone') as Tone) || 'neutral');
  const [autoPaste, setAutoPaste] = useState(() => {
    const saved = localStorage.getItem('rt_auto_paste');
    return saved === null ? true : saved === 'true';
  });

  // View State: 'translator' | 'settings' | 'history'
  const [view, setView] = useState<'translator' | 'settings' | 'history'>(() => {
    const savedApiKey = localStorage.getItem('rt_api_key');
    return savedApiKey ? 'translator' : 'settings';
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rt_history') || '[]');
    } catch { return []; }
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('rt_api_key', apiKey);
    localStorage.setItem('rt_provider', provider);
    localStorage.setItem('rt_model', model);
    localStorage.setItem('rt_tone', tone);
    localStorage.setItem('rt_auto_paste', String(autoPaste));
    localStorage.setItem('rt_history', JSON.stringify(history));
  }, [apiKey, provider, model, tone, autoPaste, history]);

  // Initial Logic & Dynamic Resizing
  useEffect(() => {
    if (!apiKey && view === 'translator') {
      setView('settings');
    }

    // Dynamic Resizing Logic
    if (window.electronAPI) {
      if (view === 'translator') {
        window.electronAPI.resizeWindow(300, 200);
      } else {
        // Both Settings and History need more space
        window.electronAPI.resizeWindow(400, 500);
      }
    }

  }, [view, apiKey]);

  // Model Fetching
  useEffect(() => {
    if (apiKey.length > 5) {
      fetchModels(provider, apiKey).then(models => {
        setAvailableModels(models);
        if (models.length > 0 && (!model || !models.includes(model))) {
          setModel(models[0]);
        }
      });
    }
  }, [apiKey, provider]);

  // Real-time Clipboard Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      // Only auto-fill if we are in translator view and input is empty (to avoid overwriting)
      // OR if the user explicitly cleared it. 
      // Actually, 'auto-fill' logic usually runs on window focus.
      // BUT user asked for "real-time update", implying if they copy something while window is open.
      // We'll trust the explicit "Auto-Get Input" on focus for aggressive behavior,
      // but for open window, maybe only update if input is empty?
      // Let's stick to the "On Show" logic for aggressive fill, but verify the "Real-time" request.
      // "实时更新剪切板里复制的内容...不是app弹出来的时候才更新" -> implies if App is OPEN and user copies elsewhere.

      if (window.electronAPI && view === 'translator' && !inputText) {
        try {
          const text = await window.electronAPI.getClipboardText();
          if (text && text.trim().length > 0 && text.trim() !== inputText) {
            // Avoid infinite loops or fighting user input. Only fill if empty.
            setInputText(text);
          }
        } catch (e) { }
      }
    }, 500); // 500ms polling for snappier response
    return () => clearInterval(interval);
  }, [view, inputText]);

  // On Show: Force check clipboard
  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onShow(async () => {
      if (!inputText) {
        try {
          const text = await window.electronAPI.getClipboardText();
          if (text && text.trim().length > 0) {
            setInputText(text);
            setTimeout(() => inputRef.current?.select(), 50);
          }
        } catch (e) { }
      }
      inputRef.current?.focus();
    });
    return () => { };
  }, []);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    let fullTranslation = '';
    setOutputText('');

    try {
      fullTranslation = await translateToSlang({
        text: inputText,
        apiKey,
        provider,
        model,
        tone,
        onStream: (chunk) => setOutputText(prev => prev + chunk)
      });

      // Save to History
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        original: inputText,
        translated: fullTranslation,
        tone,
        timestamp: Date.now()
      };
      setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50

      if (autoPaste) {
        setTimeout(() => {
          window.electronAPI.pasteText(fullTranslation);
          setInputText(''); // Clear input after pasting
        }, 100);
      }

    } catch (error) {
      setOutputText('Error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTranslate();
    }
    if (e.key === 'Escape') {
      window.electronAPI.hideWindow();
    }
  };

  // Shared Title Bar
  const TitleBar = () => (
    <div className="h-8 shrink-0 bg-gray-900/30 flex items-center justify-between px-3 drag-handle select-none border-b border-gray-800/30 relative">
      <div className="flex items-center gap-2 relative z-50">
        {/* no-drag region for buttons */}
        <div className="flex gap-1.5 no-drag pointer-events-auto">
          <div
            className="w-2.5 h-2.5 rounded-full bg-red-500 hover:bg-red-400 cursor-pointer shadow-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Close clicked'); // Debug
              if (window.electronAPI) window.electronAPI.hideWindow();
            }}
          ></div>
          <div
            className="w-2.5 h-2.5 rounded-full bg-yellow-500 hover:bg-yellow-400 cursor-pointer shadow-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (window.electronAPI) window.electronAPI.minimizeWindow();
            }}
          ></div>
        </div>
      </div>

      <div className="flex items-center gap-2 no-drag relative z-50 pointer-events-auto">
        {view !== 'translator' && (
          <button
            onClick={() => setView('translator')}
            className="text-gray-500 hover:text-white transition-colors text-[10px] font-bold uppercase"
          >
            Back
          </button>
        )}

        {view === 'translator' && (
          <>
            <button
              onClick={() => setView('history')}
              className="text-gray-500 hover:text-white transition-colors"
              title="History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </button>
            <button
              onClick={() => setView('settings')}
              className="text-gray-500 hover:text-white transition-colors"
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 5 9.4a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
          </>
        )}
      </div>
    </div>
  );

  // Settings View
  if (view === 'settings') {
    return (
      <div className="flex h-screen w-full flex-col bg-gray-950 text-white font-sans overflow-hidden">
        <TitleBar />
        <div className="flex-1 p-6 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight">RealTalk Setup</h1>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Provider</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-900 p-1 rounded-lg">
                {(['openai', 'gemini'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`py-1.5 text-xs font-semibold rounded-md transition-all ${provider === p ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}
                  >
                    {p === 'openai' ? 'OpenAI' : 'Gemini'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
                placeholder={provider === 'openai' ? "sk-..." : "AIza..."}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                disabled={availableModels.length === 0}
              >
                {availableModels.length === 0 && <option>Enter Key to load models...</option>}
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // History View
  if (view === 'history') {
    return (
      <div className="flex h-screen w-full flex-col bg-gray-950 text-white font-sans overflow-hidden">
        <TitleBar />
        <div className="flex-1 p-4 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-bold tracking-tight">History</h1>
            <button onClick={() => setHistory([])} className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase">Clear All</button>
          </div>

          <div className="space-y-3">
            {history.length === 0 && <p className="text-gray-600 text-xs text-center py-10">No history yet.</p>}
            {history.map(item => (
              <div key={item.id} className="bg-gray-900 rounded-lg p-3 border border-gray-800 group">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[9px] font-bold uppercase text-gray-500">{new Date(item.timestamp).toLocaleTimeString()} • {item.tone}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => window.electronAPI.pasteText(item.translated)}
                      className="text-blue-500 hover:text-blue-400 text-[10px] font-bold"
                    >
                      Use
                    </button>
                  </div>
                </div>
                <p className="text-gray-400 text-xs mb-1 line-clamp-2">{item.original}</p>
                <p className="text-blue-100 text-xs font-medium leading-relaxed">{item.translated}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main Compact View
  return (
    <div className="flex h-screen w-full flex-col bg-gray-900/80 backdrop-blur-md text-white overflow-hidden border border-gray-700/50 shadow-2xl rounded-xl">
      <TitleBar />

      <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">
        <textarea
          ref={inputRef}
          className="w-full flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder-gray-600 font-medium leading-relaxed custom-scrollbar"
          placeholder="Type or Paste Chinese..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        {/* Output / Status Area */}
        {isLoading && (
          <div className="shrink-0 p-2 animate-pulse">
            <p className="text-gray-500 text-xs italic">Translating...</p>
          </div>
        )}
        {!isLoading && outputText && (
          <div className="shrink-0 max-h-[40%] overflow-y-auto custom-scrollbar bg-blue-900/20 border border-blue-500/20 rounded-md p-2 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-blue-100 text-xs font-medium leading-relaxed select-text whitespace-pre-wrap">{outputText}</p>
          </div>
        )}

        <div className="h-7 shrink-0 flex items-center justify-between mt-auto pt-1 border-t border-gray-800/30">
          <div className="flex bg-gray-800/50 rounded p-0.5 scale-90 origin-left">
            {(['casual', 'neutral', 'formal'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-sm transition-all ${tone === t ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <div className={`w-2 h-2 rounded-full border transition-colors ${autoPaste ? 'bg-green-500 border-green-500' : 'border-gray-600 group-hover:border-gray-400'}`}></div>
              <span
                className="text-[9px] uppercase font-bold text-gray-500 group-hover:text-gray-300 select-none"
                onClick={() => setAutoPaste(!autoPaste)}
              >
                Auto-Paste
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
