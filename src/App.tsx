import { useState, useEffect, useRef } from 'react';
import { translateToSlang, fetchModels, APIProvider, Tone } from './services/translator';

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
    return saved === null ? true : saved === 'true'; // Default true
  });
  const [isSetupMode, setIsSetupMode] = useState(!apiKey);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem('rt_api_key', apiKey);
    localStorage.setItem('rt_provider', provider);
    localStorage.setItem('rt_model', model);
    localStorage.setItem('rt_tone', tone);
    localStorage.setItem('rt_auto_paste', String(autoPaste));
  }, [apiKey, provider, model, tone, autoPaste]);

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

  // Auto-Input Logic
  useEffect(() => {
    // Listen for window show event
    if (!window.electronAPI) return;

    window.electronAPI.onShow(async () => {
      // Only read if input is empty to avoid overwriting user work
      if (!inputText) {
        try {
          const text = await window.electronAPI.getClipboardText();
          // Simple heuristic: if it looks like Chinese (or just non-empty), pre-fill it
          if (text && text.trim().length > 0 && text.length < 500) {
            setInputText(text);
            // focus
            setTimeout(() => inputRef.current?.select(), 50);
          }
        } catch (e) {
          console.error("Failed to read clipboard", e);
        }
      }
      inputRef.current?.focus();
    });
    return () => { };
  }, []); // Run once

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

      if (autoPaste) {
        setTimeout(() => {
          window.electronAPI.pasteText(fullTranslation);
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

  // Setup View
  if (isSetupMode) {
    return (
      <div className="flex h-screen w-full flex-col bg-gray-900 text-white font-sans overflow-hidden">
        <div className="h-8 flex items-center justify-between px-3 drag-handle select-none">
          <div className="flex gap-1.5 no-drag">
            <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer" onClick={() => window.electronAPI.hideWindow()}></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer" onClick={() => window.electronAPI.minimizeWindow()}></div>
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">RealTalk Setup</h1>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Provider</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-800 p-1 rounded-lg">
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

          <button
            disabled={!apiKey}
            onClick={() => setIsSetupMode(false)}
            className={`mt-6 w-full font-bold py-2.5 rounded-lg transition-all text-sm ${isLoading ? 'bg-gray-700 text-gray-400 cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed'}`}
          >
            {isLoading ? 'Loading...' : 'Start RealTalk'}
          </button>
        </div>
      </div>
    );
  }

  // Main Compact View
  return (
    <div className="flex h-screen w-full flex-col bg-gray-900/80 backdrop-blur-md text-white overflow-hidden border border-gray-700/50 shadow-2xl rounded-xl">
      {/* TitleBar */}
      <div className="h-8 shrink-0 bg-gray-900/30 flex items-center justify-between px-3 drag-handle select-none border-b border-gray-800/30">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 no-drag">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer transition-colors" onClick={() => window.electronAPI.hideWindow()}></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer transition-colors" onClick={() => window.electronAPI.minimizeWindow()}></div>
          </div>
        </div>
        <button
          onClick={() => setIsSetupMode(true)}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 5 9.4a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">
        {/* Input Area */}
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
        {outputText && (
          <div className="shrink-0 max-h-[40%] overflow-y-auto custom-scrollbar bg-blue-900/20 border border-blue-500/20 rounded-md p-2 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-blue-100 text-xs font-medium leading-relaxed select-text whitespace-pre-wrap">{outputText}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="h-7 shrink-0 flex items-center justify-between mt-auto pt-1 border-t border-gray-800/30">
          {/* Tone Selector */}
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

          {/* Auto Paste Toggle */}
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
