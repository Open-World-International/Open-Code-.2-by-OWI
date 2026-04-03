import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Eye, 
  Play, 
  Code2, 
  ChevronRight, 
  Terminal,
  Loader2,
  Sparkles,
  Github,
  Moon,
  Sun,
  MessageSquare,
  Send,
  User,
  Bot,
  Plus,
  Settings,
  X,
  Cpu,
  Zap,
  ShieldCheck,
  Download,
  FileText,
  Folder,
  Trash2,
  Edit2,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', paizaId: 'javascript' },
  { id: 'typescript', name: 'TypeScript', paizaId: 'typescript' },
  { id: 'python', name: 'Python', paizaId: 'python3' },
  { id: 'cpp', name: 'C++', paizaId: 'cpp' },
  { id: 'c', name: 'C', paizaId: 'c' },
  { id: 'java', name: 'Java', paizaId: 'java' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'json', name: 'JSON' },
  { id: 'markdown', name: 'Markdown' },
];

const ENVIRONMENTS = [
  { id: 'javascript', name: 'JavaScript', language: 'javascript', icon: <Zap className="w-4 h-4" />, boilerplate: '// JavaScript Environment\nconsole.log("Hello from Node.js!");' },
  { id: 'python', name: 'Python', language: 'python', icon: <Cpu className="w-4 h-4" />, boilerplate: '# Python Environment\nprint("Hello from Python!")' },
  { id: 'cpp', name: 'C++', language: 'cpp', icon: <Terminal className="w-4 h-4" />, boilerplate: '// C++ Environment\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}' },
  { id: 'html', name: 'Web App', language: 'html', icon: <Code2 className="w-4 h-4" />, boilerplate: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Web App</title>\n</head>\n<body>\n  <h1>Hello from the Web!</h1>\n</body>\n</html>' },
];

export default function App() {
  const [activeEnvId, setActiveEnvId] = useState<string>(() => localStorage.getItem('active_env') || 'javascript');
  const [content, setContent] = useState<string>(() => localStorage.getItem('code_content') || ENVIRONMENTS[0].boilerplate);
  
  const activeEnv = ENVIRONMENTS.find(e => e.id === activeEnvId) || ENVIRONMENTS[0];
  const activeLanguage = activeEnv.language;
  
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [showOutputView, setShowOutputView] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishStep, setPublishStep] = useState<'login' | 'config' | 'publishing' | 'success'>('login');
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [repoName, setRepoName] = useState('my-open-code-project');
  const [publishUrl, setPublishUrl] = useState('');
  const [publishError, setPublishError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  
  // AI State
  const [groqKey, setGroqKey] = useState<string>(() => localStorage.getItem('groq_api_key') || '');
  const [geminiKey, setGeminiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [activeAI, setActiveAI] = useState<'groq' | 'gemini'>('gemini');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string, ai?: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);

  useEffect(() => {
    localStorage.setItem('groq_api_key', groqKey);
  }, [groqKey]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', geminiKey);
  }, [geminiKey]);

  useEffect(() => {
    localStorage.setItem('active_env', activeEnvId);
    localStorage.setItem('code_content', content);
  }, [activeEnvId, content]);

  const [showEnvConfirm, setShowEnvConfirm] = useState<string | null>(null);

  const handleEnvChange = (envId: string) => {
    const env = ENVIRONMENTS.find(e => e.id === envId);
    if (env) {
      setActiveEnvId(envId);
      setContent(env.boilerplate);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        setGithubToken(event.data.token);
        setPublishStep('config');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGitHubLogin = async () => {
    try {
      const response = await fetch('/api/auth/github/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url,
        'github_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error('GitHub Login Error:', error);
      alert('Failed to initiate GitHub login');
    }
  };

  const handlePublishToGitHub = async () => {
    if (!githubToken || !repoName) return;
    
    setIsPublishing(true);
    setPublishStep('publishing');
    setPublishError('');

    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken,
          repoName,
          description: "Created with Open-Code"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      if (data.success) {
        setPublishUrl(data.url);
        setPublishStep('success');
      } else {
        throw new Error(data.error || 'Failed to publish');
      }
    } catch (error: any) {
      console.error('Publish Error:', error);
      setPublishError(error.message);
      setPublishStep('config');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRun = async () => {
    const selectedLang = LANGUAGES.find(l => l.id === activeLanguage);
    if (!selectedLang?.paizaId) {
      setOutput(`Execution not supported for ${activeLanguage} yet.`);
      setShowOutputView(true);
      return;
    }

    setIsRunning(true);
    setShowOutputView(true);
    setOutput('Submitting code to execution engine...');

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: content,
          language: selectedLang.paizaId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error (${response.status}): ${errorText}`);
      }

      const createData = await response.json();
      const id = createData.id;

      if (!id) {
        throw new Error('Failed to create execution task.');
      }

      // Step 2: Poll for completion from the frontend
      let status = 'running';
      let attempts = 0;
      const maxAttempts = 30; // More attempts allowed from frontend
      const pollInterval = 1500; // 1.5s interval
      let details: any = null;

      while (status === 'running' && attempts < maxAttempts) {
        attempts++;
        setOutput(`Running... (Attempt ${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        const statusRes = await fetch(`/api/status/${id}`);
        if (!statusRes.ok) {
          const errorText = await statusRes.text();
          throw new Error(`Status Check Error (${statusRes.status}): ${errorText}`);
        }

        details = await statusRes.json();
        status = details.status;
      }

      if (status === 'running') {
        throw new Error('Execution timed out. The code might be taking too long to run.');
      }
      
      const stdout = details.stdout || '';
      const stderr = details.stderr || '';
      const build_stderr = details.build_stderr || '';
      
      const result = stdout + (stderr ? `\n\nRuntime Errors:\n${stderr}` : '') + (build_stderr ? `\n\nBuild Errors:\n${build_stderr}` : '');
      
      setOutput(result || '(No output)');
    } catch (error) {
      console.error('Execution Error:', error);
      setOutput('Error executing code: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isAnalyzing) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAnalyzing(true);

    try {
      if (activeAI === 'gemini') {
        if (!geminiKey) throw new Error('Gemini API key is required');
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        
        const prompt = `You are G-Coder, an AI programming assistant. 
        Current context:
        Language: ${activeLanguage}
        Code:
        \`\`\`${activeLanguage}
        ${content}
        \`\`\`
        
        User question: ${userMessage}`;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        const text = response.text || "No response from AI.";
        
        setChatMessages(prev => [...prev, { role: 'assistant', content: text, ai: 'gemini' }]);
      } else {
        if (!groqKey) throw new Error('Groq API key is required');
        // Placeholder for Groq implementation if needed, or just use Gemini for now
        setChatMessages(prev => [...prev, { role: 'assistant', content: "Groq support is currently limited. Please use Gemini for the best experience.", ai: 'groq' }]);
      }
    } catch (error: any) {
      console.error('AI Error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveConfig = () => {
    setShowAIConfig(false);
  };

  const handleDisconnectAI = () => {
    setGroqKey('');
    setGeminiKey('');
    setShowAIConfig(false);
  };

  if (showOutputView) {
    return (
      <div className="h-screen w-screen bg-[#0d0d0d] text-gray-300 font-mono flex flex-col overflow-hidden">
        {/* Output Header */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#111111]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <span className="text-white uppercase tracking-widest text-xs">Execution Output</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
          </div>
          <button 
            onClick={() => setShowOutputView(false)}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-all border border-white/10"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Editor
          </button>
        </header>

        {/* Output Content */}
        <main className="flex-1 p-8 overflow-y-auto bg-black/40 relative">
          <AnimatePresence mode="wait">
            {isRunning ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center h-full gap-4"
              >
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-gray-500 animate-pulse uppercase tracking-[0.2em] text-[10px] font-bold">
                  Simulating Environment...
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto w-full"
              >
                <div className="flex items-center gap-2 mb-6 text-xs text-gray-500 border-b border-white/5 pb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Process finished with exit code 0</span>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5 shadow-2xl min-h-[300px]">
                  <pre className="whitespace-pre-wrap break-words leading-relaxed text-emerald-400/90">
                    {output}
                  </pre>
                </div>
                
                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Language</div>
                    <div className="text-sm text-white capitalize">{activeLanguage}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Memory</div>
                    <div className="text-sm text-white">~12.4 MB</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Time</div>
                    <div className="text-sm text-white">0.04s</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="h-10 border-t border-white/5 bg-[#111111] flex items-center px-6 text-[10px] text-gray-600 gap-4">
          <span>&copy; 2026 Open-Code</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-gray-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside 
        className="w-80 bg-[#111111] border-r border-white/5 flex flex-col overflow-hidden z-[60]"
      >
        <div className="p-6 flex flex-col gap-1 border-b border-white/5">
          <div className="flex items-center gap-3 text-left group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600">
              <Code2 className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">Open-Code Version 2</h1>
              <p className="text-[10px] text-gray-500 font-medium -mt-1">powered by OWI</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          {/* Environment Selection */}
          <section>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4 block">
              Active Environment
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ENVIRONMENTS.map(env => (
                <button
                  key={env.id}
                  onClick={() => handleEnvChange(env.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    activeEnvId === env.id
                      ? 'bg-blue-600/10 border-blue-500/50 text-white'
                      : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                  }`}
                >
                  {env.icon}
                  <span className="text-[10px] font-bold uppercase tracking-widest">{env.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Why use GitHub? */}
          <section className="p-4 rounded-2xl bg-purple-600/10 border border-purple-500/20 space-y-3">
            <div className="flex items-center gap-2 text-purple-500">
              <Github className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Why use GitHub?</span>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-purple-200/70 leading-relaxed">
                GitHub is the world\'s leading software development platform. By publishing your code here, you can:
              </p>
              <ul className="text-[9px] text-purple-300/60 space-y-1 list-disc pl-3">
                <li>Showcase your work to potential employers</li>
                <li>Collaborate with developers worldwide</li>
                <li>Keep a secure backup of your projects</li>
                <li>Track changes and version history</li>
              </ul>
            </div>
          </section>

          {/* Environment Info */}
          <section>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4 block">
              Environment
            </label>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500">Active Language</span>
                <span className="text-blue-400 font-bold uppercase">{activeLanguage}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500">Status</span>
                <span className="text-emerald-500 font-bold uppercase">Ready</span>
              </div>
            </div>
          </section>

          {/* Why Open-Code? */}
          <section>
            <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 p-4 rounded-2xl border border-white/10">
              <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                Why Open-Code?
              </h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Open-Code is a revolutionary platform designed for students and developers. 
                It\'s <span className="text-emerald-400 font-bold">completely free</span>, removing 
                financial barriers to coding tools.
              </p>
            </div>
          </section>

          {/* Get AI Support Button */}
          <section>
            <button 
              onClick={() => setShowAIConfig(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-between group hover:scale-[1.02] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-300" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white">Get AI Support</div>
                  <div className="text-[9px] text-white/70">Configure API Keys</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
            </button>
          </section>
          <section>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4 block">
              G-Coder Versions
            </label>
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (!geminiKey) {
                    setShowAIConfig(true);
                  } else {
                    setActiveAI('gemini');
                    setIsChatOpen(true);
                  }
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  activeAI === 'gemini' && isChatOpen && geminiKey
                    ? 'bg-blue-600/10 border-blue-500/50 text-white'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${geminiKey ? 'bg-blue-600' : 'bg-gray-600'}`}>
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">Gemini 3.1 Pro</div>
                    <div className="text-[9px] opacity-60">{geminiKey ? 'Advanced reasoning' : 'Setup required'}</div>
                  </div>
                </div>
                {geminiKey ? <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> : <Plus className="w-3 h-3" />}
              </button>

              <button
                onClick={() => {
                  if (!groqKey) {
                    setShowAIConfig(true);
                  } else {
                    setActiveAI('groq');
                    setIsChatOpen(true);
                  }
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  activeAI === 'groq' && isChatOpen
                    ? 'bg-purple-600/10 border-purple-500/50 text-white'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${groqKey ? 'bg-purple-600' : 'bg-gray-600'}`}>
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">Groq</div>
                    <div className="text-[9px] opacity-60">Ultra-fast inference</div>
                  </div>
                </div>
                {groqKey ? <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> : <Plus className="w-3 h-3" />}
              </button>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 px-2">
            <span>Status</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Connected
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs"
            >
              {theme === 'vs-dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'vs-dark' ? 'Light' : 'Dark'}
            </button>
          </div>
          <a 
            href="https://github.com/Open-World-International/Open-Code-by-OWI"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-all text-xs font-bold mt-2"
          >
            <Github className="w-4 h-4" />
            GitHub Repository
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header Bar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0d0d0d]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-gray-500 ml-2">Environment</span>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <span className="text-white">{activeEnv.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="relative flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-all border border-white/10"
            >
              <MessageSquare className="w-4 h-4" />
              AI Assistant
              {!groqKey && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-[#0d0d0d] animate-pulse" />
              )}
            </button>
            <button 
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-600/20"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Code
            </button>
            <button 
              onClick={() => {
                setPublishStep(githubToken ? 'config' : 'login');
                setIsPublishModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-600/20"
            >
              <Github className="w-4 h-4" />
              Publish
            </button>
            <div className="h-6 w-px bg-white/10 mx-1" />
            <button 
              onClick={() => setShowOutputView(!showOutputView)}
              className={`p-2 rounded-lg transition-all ${
                showOutputView 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                  : 'hover:bg-white/5 text-gray-500 hover:text-white'
              }`}
              title="Toggle Preview"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                language={activeLanguage}
                theme={theme}
                value={content}
                onChange={(val) => setContent(val || '')}
                options={{
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 20 },
                  lineNumbers: 'on',
                  glyphMargin: false,
                  folding: true,
                  lineDecorationsWidth: 0,
                  lineNumbersMinChars: 3,
                }}
              />
            </div>
          </div>
        </div>

        {/* AI Chat Panel */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 h-[400px] bg-[#111111] border-t border-white/10 z-50 flex flex-col"
            >
              <div className="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-black/20">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-xs font-bold text-white uppercase tracking-widest">
                      G-Coder: {activeAI === 'gemini' ? 'Gemini 3.1 Pro' : 'Groq'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                      <Bot className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">How can I help you today?</h4>
                      <p className="text-xs text-gray-500 max-w-[280px]">
                        I can help you write code, debug errors, or explain complex concepts.
                      </p>
                    </div>
                    {((activeAI === 'groq' && !groqKey) || (activeAI === 'gemini' && !geminiKey)) && (
                      <div className="p-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-[10px] text-blue-400 max-w-[240px]">
                        Please add your {activeAI === 'groq' ? 'Groq' : 'Gemini'} API key in the sidebar to start chatting.
                      </div>
                    )}
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-4 ${msg.role === 'assistant' ? 'bg-white/5 -mx-6 px-6 py-6' : ''}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-blue-600/20 text-blue-400' : 'bg-white/10 text-white'}`}>
                        {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                          {msg.role === 'assistant' ? 'G-Coder' : 'You'}
                        </div>
                        <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isAnalyzing && (
                  <div className="flex gap-4 bg-white/5 -mx-6 px-6 py-6">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">G-Coder is thinking...</div>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/5 bg-black/20">
                <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={((activeAI === 'groq' && !groqKey) || (activeAI === 'gemini' && !geminiKey)) ? `Add a ${activeAI === 'groq' ? 'Groq' : 'Gemini'} API key to start...` : "Ask anything about your code..."}
                    disabled={((activeAI === 'groq' && !groqKey) || (activeAI === 'gemini' && !geminiKey)) || isAnalyzing}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={!chatInput.trim() || isAnalyzing || (activeAI === 'groq' && !groqKey) || (activeAI === 'gemini' && !geminiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* AI Config Modal */}
      <AnimatePresence>
        {showAIConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">AI Configuration</h2>
                      <p className="text-[11px] text-gray-500">Enter your own API keys to unlock Gemini and Groq features.</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAIConfig(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Gemini Config */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-bold text-white">Gemini 3.1 Pro</span>
                      </div>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[10px] text-blue-400 hover:underline flex items-center gap-1">
                        Get Gemini Key <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Advanced reasoning and deep code understanding. Best for complex logic and refactoring.
                    </p>
                    <input 
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="Enter Gemini API Key"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>

                  {/* Groq Config */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-bold text-white">Groq Cloud</span>
                      </div>
                      <a href="https://console.groq.com/keys" target="_blank" className="text-[10px] text-purple-400 hover:underline flex items-center gap-1">
                        Get Groq Key <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Ultra-fast inference engine. Ideal for quick code completions and snappy chat responses.
                    </p>
                    <input 
                      type="password"
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder="Paste your Groq API key here..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    onClick={handleSaveConfig}
                    className="w-full py-3 rounded-xl bg-white text-black hover:bg-gray-200 text-sm font-bold transition-all"
                  >
                    Save Configuration
                  </button>
                  {groqKey && (
                    <button 
                      onClick={handleDisconnectAI}
                      className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold transition-all border border-red-500/20"
                    >
                      Disconnect AI
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Publish Modal */}
      <AnimatePresence>
        {isPublishModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                {publishStep === 'login' && (
                  <div className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Github className="w-8 h-8 text-purple-500" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-white">Connect GitHub</h2>
                      <p className="text-sm text-gray-500">Login with your GitHub account to sync your project.</p>
                    </div>
                    <button 
                      onClick={handleGitHubLogin}
                      className="w-full py-3 rounded-xl bg-white text-black hover:bg-gray-200 text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Github className="w-4 h-4" />
                      Login with GitHub
                    </button>
                    <button 
                      onClick={() => setIsPublishModalOpen(false)}
                      className="text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                )}

                {publishStep === 'config' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
                        <Github className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Repository Settings</h2>
                        <p className="text-xs text-gray-500">Choose a name for your new repository.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Repository Name</label>
                        <input 
                          type="text"
                          value={repoName}
                          onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                          placeholder="my-awesome-project"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>

                      {publishError && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                          {publishError}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button 
                          onClick={() => setIsPublishModalOpen(false)}
                          className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handlePublishToGitHub}
                          disabled={!repoName || isPublishing}
                          className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                        >
                          {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Publish Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {publishStep === 'publishing' && (
                  <div className="py-12 text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <Github className="absolute inset-0 m-auto w-8 h-8 text-purple-500" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-white">Syncing to GitHub...</h2>
                      <p className="text-sm text-gray-500">Creating repository and pushing your files.</p>
                    </div>
                  </div>
                )}

                {publishStep === 'success' && (
                  <div className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-white">Successfully Published!</h2>
                      <p className="text-sm text-gray-500">Your project is now live on GitHub.</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 break-all">
                      <a 
                        href={publishUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline text-sm font-mono"
                      >
                        {publishUrl}
                      </a>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setIsPublishModalOpen(false)}
                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors"
                      >
                        Close
                      </button>
                      <a 
                        href={publishUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                      >
                        View on GitHub
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
