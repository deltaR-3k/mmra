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
  const [autoPaste, setAutoPaste] = useState(() => localStorage.getItem('rt_auto_paste') === 'true');
  const [isSetupMode, setIsSetupMode] = useState(!apiKey); // Initial setup check

  // Refs for auto-scrolling if needed, though we want minimal scroll
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem('rt_api_key', apiKey);
    localStorage.setItem('rt_provider', provider);
    localStorage.setItem('rt_model', model);
    localStorage.setItem('rt_tone', tone);
    localStorage.setItem('rt_auto_paste', String(autoPaste));

    // If key exists, exit setup mode automatically on load (unless manually entered back)
    if (apiKey && isSetupMode) {
      // We stay in setup mode until user clicks "Done", but we could auto-transition.
      // Let's rely on the user clicking "Start RealTalk".
    }
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

      // Auto insertion
      if (autoPaste) {
        // Small delay to ensure render
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
      <div className="flex h-screen w-full flex-col bg-gray-950 text-white font-sans overflow-hidden">
        <div className="flex-1 p-8 flex flex-col justify-center max-w-md mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome to RealTalk</h1>
            <p className="text-gray-500 mt-2 text-sm">Make your messages authentically American.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Provider</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-900 p-1 rounded-lg">
                {(['openai', 'gemini'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`py-2 text-sm font-semibold rounded-md transition-all ${provider === p ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800'}`}
                  >
                    {p === 'openai' ? 'OpenAI' : 'Gemini'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                placeholder={provider === 'openai' ? "sk-..." : "AIza..."}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
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
            className={`mt-8 w-full font-bold py-3 rounded-lg transition-all ${isLoading ? 'bg-gray-700 text-gray-400 cursor-wait' : 'bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'}`}
          >
            {isLoading ? 'Loading...' : 'Get Started'}
          </button>
        </div>
      </div>
    );
  }

  // Main Compact View
  return (
    <div className="flex h-screen w-full flex-col bg-gray-950/95 text-white overflow-hidden border border-gray-800 shadow-2xl rounded-xl">
      {/* TitleBar */}
      <div className="h-9 bg-gray-900/50 flex items-center justify-between px-3 drag-handle select-none border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 no-drag">
            <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer transition-colors" onClick={() => window.electronAPI.hideWindow()}></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer transition-colors" onClick={() => window.electronAPI.minimizeWindow()}></div>
          </div>
          {/* Mimic standard controls slightly */}
          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase ml-2">RealTalk</span>
        </div>
        <button
          onClick={() => setIsSetupMode(true)}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 5 9.4a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Input Area */}
        <textarea
          ref={inputRef}
          className="w-full flex-1 bg-transparent text-lg resize-none focus:outline-none placeholder-gray-700 font-medium leading-relaxed"
          placeholder="Type Chinese here..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        {/* Output / Status Area */}
        {outputText && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-blue-200 text-sm font-medium leading-relaxed select-text">{outputText}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="h-8 flex items-center justify-between mt-auto pt-2 border-t border-gray-800">
          {/* Tone Selector */}
          <div className="flex bg-gray-900 rounded-md p-0.5">
            {(['casual', 'neutral', 'formal'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-all ${tone === t ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Auto Paste Toggle & Insert */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-3 h-3 rounded-full border transition-colors ${autoPaste ? 'bg-green-500 border-green-500' : 'border-gray-600 group-hover:border-gray-400'}`}></div>
              <span
                className="text-[10px] uppercase font-bold text-gray-500 group-hover:text-gray-300 select-none"
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
