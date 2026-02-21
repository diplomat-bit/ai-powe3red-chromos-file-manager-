
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, RotateCw, LayoutGrid, List, MoreVertical, ChevronRight, 
  ArrowLeft, X, Plus, Folder, Brain, MessageSquare, FileUp, Sparkles, 
  Loader2, FolderPlus, Share2, Trash2, Download, Github, Palette,
  Globe, UserPlus, Image as ImageIcon, HardDrive, Eye, Maximize2, Terminal,
  Cloud, LogIn, CloudOff, Star, Shield, Info, Lock, Mail, User, CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { FileItem, FileType, FileSource } from './types';
import { NAV_ITEMS, getFileIcon, formatSize } from './constants';
import { smartSearch, indexFile, queryKnowledgeBase, generateAIImage } from './services/geminiService';
import { fetchUserRepos, mapGithubToFiles, fetchRepoContents, fetchRawGithubContent } from './services/githubService';
import { fetchDriveFiles, mapDriveToFiles, fetchDriveFileContent } from './services/googleDriveService';
import { str } from './lib/loadTimeData';

export default function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentNav, setCurrentNav] = useState('root');
  const [path, setPath] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'gallery'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [aiResults, setAiResults] = useState<string[] | null>(null);
  
  // Auth States - Gatekeeping the App
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [githubUsers, setGithubUsers] = useState<string[]>(['jocall3']);
  const [driveToken, setDriveToken] = useState<string | null>(null);

  // UI Panels
  const [isBrainOpen, setIsBrainOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  // AI State
  const [brainChat, setBrainChat] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [brainInput, setBrainInput] = useState('');
  const [isBrainThinking, setIsBrainThinking] = useState(false);
  const [studioPrompt, setStudioPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFolderId = path.length > 0 ? path[path.length - 1] : currentNav;

  const selectedFile = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return files.find(f => f.id === selectedIds[0]) || null;
  }, [selectedIds, files]);

  // Initial Data Load (Local/GitHub only before Google Login)
  useEffect(() => {
    if (isLoggedIn) {
        githubUsers.forEach(user => syncUserRepos(user));
    }
  }, [isLoggedIn]);

  const filteredFiles = useMemo(() => {
    let base = files;
    if (aiResults) base = files.filter(f => aiResults.includes(f.id));
    else if (searchQuery && !isSearching) {
      base = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    } else {
      base = files.filter(f => f.parentId === currentFolderId);
    }
    
    if (currentNav === 'starred') base = files.filter(f => f.aiKeywords?.includes('starred'));
    if (viewMode === 'gallery') base = base.filter(f => f.type === FileType.IMAGE);
    
    return base;
  }, [files, currentFolderId, searchQuery, aiResults, isSearching, viewMode, currentNav]);

  // Google Login Mandatory Flow
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!loginEmail || !loginPassword) return;
    
    setIsAuthenticating(true);
    // Real-world delay simulation for SSL handshake/Verification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockToken = "demo-token";
    setDriveToken(mockToken);
    setIsLoggedIn(true);
    
    try {
      await syncDriveRoot(mockToken);
      setCurrentNav('drive');
      setPath([]);
    } catch (err) {
      console.error("Cloud initial sync error", err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setDriveToken(null);
    setIsLoggedIn(false);
    setFiles([]);
    setCurrentNav('root');
    setPath([]);
    setLoginEmail('');
    setLoginPassword('');
  };

  const syncDriveRoot = async (token: string) => {
    setIsLoadingContent(true);
    try {
      const driveItems = await fetchDriveFiles(token);
      const mapped = mapDriveToFiles(driveItems, 'drive');
      setFiles(prev => {
        const others = prev.filter(f => f.source !== 'google-drive');
        return [...others, ...mapped];
      });
    } finally {
      setIsLoadingContent(false);
    }
  };

  const syncUserRepos = async (username: string) => {
    setIsLoadingContent(true);
    const repos = await fetchUserRepos(username);
    const mapped = mapGithubToFiles(repos, `gh-${username}`, username, "Repositories");
    const userFolder: FileItem = {
      id: `gh-${username}`,
      name: `${username} (GitHub)`,
      type: FileType.FOLDER,
      size: null,
      lastModified: new Date().toLocaleDateString(),
      parentId: 'root',
      source: 'github',
      githubOwner: username
    };
    setFiles(prev => {
      const others = prev.filter(f => !(f.source === 'github' && f.githubOwner === username));
      return [...others, userFolder, ...mapped];
    });
    setIsLoadingContent(false);
  };

  const handleFolderClick = async (file: FileItem) => {
    if (file.type !== FileType.FOLDER) return;
    
    if (file.source === 'github' && file.githubOwner && file.githubRepo) {
      const existingChildren = files.some(f => f.parentId === file.id);
      if (!existingChildren) {
        setIsLoadingContent(true);
        const ghContents = await fetchRepoContents(file.githubOwner, file.githubRepo, file.name === file.githubRepo ? "" : file.name);
        const mapped = mapGithubToFiles(ghContents, file.id, file.githubOwner, file.githubRepo);
        setFiles(prev => [...prev, ...mapped]);
        setIsLoadingContent(false);
      }
    }

    if (file.source === 'google-drive' && driveToken && file.driveFileId) {
      const existingChildren = files.some(f => f.parentId === file.id);
      if (!existingChildren) {
        setIsLoadingContent(true);
        try {
          const driveItems = await fetchDriveFiles(driveToken, file.driveFileId);
          const mapped = mapDriveToFiles(driveItems, file.id);
          setFiles(prev => [...prev, ...mapped]);
        } finally {
          setIsLoadingContent(false);
        }
      }
    }

    setPath([...path, file.id]);
    setSelectedIds([]);
  };

  const openFileViewer = async (file: FileItem) => {
    setPreviewFile(file);
    setPreviewContent(null);
    setIsLoadingContent(true);

    if (file.type === FileType.IMAGE && file.source !== 'google-drive') {
      setPreviewContent(file.content || "");
    } else if (file.source === 'github' && file.content) {
      const text = await fetchRawGithubContent(file.content);
      setPreviewContent(text);
      if (!file.aiSummary) indexExistingFile(file, text);
    } else if (file.source === 'google-drive' && driveToken && file.driveFileId) {
      const text = await fetchDriveFileContent(driveToken, file.driveFileId);
      setPreviewContent(text);
      if (!file.aiSummary) indexExistingFile(file, text);
    } else if (file.source === 'local' && file.content) {
      setPreviewContent(file.content);
    } else {
      setPreviewContent("Content unavailable for direct preview. Source: " + file.source);
    }
    setIsLoadingContent(false);
  };

  const indexExistingFile = async (file: FileItem, actualContent: string) => {
    const res = await indexFile({ ...file, content: actualContent });
    setFiles(p => p.map(f => f.id === file.id ? { ...f, aiSummary: res.summary, aiKeywords: res.keywords } : f));
  };

  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) { setAiResults(null); return; }
    setIsSearching(true);
    try {
      const results = await smartSearch(searchQuery, files);
      setAiResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBrainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brainInput.trim()) return;
    const msg = brainInput;
    setBrainInput('');
    setBrainChat(prev => [...prev, { role: 'user', text: msg }]);
    setIsBrainThinking(true);
    try {
      const res = await queryKnowledgeBase(msg, files);
      setBrainChat(prev => [...prev, { role: 'ai', text: res }]);
    } finally {
      setIsBrainThinking(false);
    }
  };

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateAIImage(studioPrompt);
      const newFile: FileItem = {
        id: `ai-${Date.now()}`,
        name: `Studio_${Math.floor(Math.random()*1000)}.png`,
        type: FileType.IMAGE,
        size: result.dataUrl.length,
        lastModified: new Date().toLocaleDateString(),
        parentId: 'ai-gallery',
        source: 'ai',
        content: result.dataUrl,
        mimeType: 'image/png',
        aiSummary: studioPrompt,
      };
      setFiles(prev => [...prev, newFile]);
      setStudioPrompt('');
      setIsStudioOpen(false);
      setCurrentNav('ai-gallery');
      setPath([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const loadedFiles = e.target.files;
    if (!loadedFiles) return;
    Array.from(loadedFiles).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        const newFile: FileItem = {
          id: Math.random().toString(36).substring(2, 11),
          name: file.name,
          type: file.type.startsWith('image/') ? FileType.IMAGE : FileType.DOCUMENT,
          size: file.size,
          lastModified: new Date().toLocaleDateString(),
          parentId: currentFolderId,
          source: 'local',
          content,
          mimeType: file.type
        };
        setFiles(prev => [...prev, newFile]);
        const indexRes = await indexFile(newFile);
        setFiles(p => p.map(f => f.id === newFile.id ? { ...f, aiSummary: indexRes.summary, aiKeywords: indexRes.keywords } : f));
      };
      file.type.startsWith('text/') ? reader.readAsText(file) : reader.readAsDataURL(file);
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full bg-[#f1f3f4] flex flex-col items-center justify-center font-sans overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0 opacity-40">
           <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-200/50 rounded-full blur-[120px] animate-pulse"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/50 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="bg-white w-[480px] rounded-[32px] shadow-[0_24px_80px_rgba(0,0,0,0.1)] border border-gray-100 p-12 z-10 flex flex-col items-center transition-all animate-in zoom-in-95 fade-in duration-700">
           <div className="mb-10 text-center">
              <div className="w-20 h-20 bg-indigo-600 rounded-[28px] flex items-center justify-center text-white shadow-xl rotate-3 mb-8 mx-auto hover:rotate-0 transition-transform">
                <HardDrive size={40} />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-gray-900 mb-2">Google Login</h1>
              <p className="text-gray-400 font-medium text-sm">Sync your Drive workspace with OMNI Intelligence.</p>
           </div>

           <form onSubmit={handleLoginSubmit} className="w-full space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors" size={20}/>
                  <input 
                    type="email" 
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Email or phone"
                    className="w-full h-16 bg-gray-50 border-2 border-transparent rounded-2xl pl-14 pr-6 font-bold text-gray-700 placeholder:text-gray-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-inner"
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors" size={20}/>
                  <input 
                    type="password" 
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-16 bg-gray-50 border-2 border-transparent rounded-2xl pl-14 pr-6 font-bold text-gray-700 placeholder:text-gray-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                 <button type="button" className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline">Forgot email?</button>
                 <button type="button" className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline">Create account</button>
              </div>

              <button 
                type="submit"
                disabled={isAuthenticating}
                className="w-full h-20 bg-indigo-600 text-white rounded-[24px] font-black text-lg uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {isAuthenticating ? (
                  <><Loader2 className="animate-spin" size={28} /> Synchronizing...</>
                ) : (
                  <><CheckCircle2 size={24} /> Next</>
                )}
              </button>
           </form>

           <div className="mt-12 flex items-center gap-3 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
              <Shield size={12}/> Secure Identity Exchange v4.2
           </div>
        </div>

        <div className="fixed bottom-10 flex gap-10 text-[11px] font-black text-gray-400 uppercase tracking-widest">
           <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
           <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
           <a href="#" className="hover:text-gray-900 transition-colors">Help</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#f8f9fa] select-none overflow-hidden relative font-sans text-[#3c4043]">
      <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
      
      <aside className="w-72 border-r border-gray-200 flex flex-col bg-white z-10 shrink-0">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3">
              <HardDrive size={24} />
            </div>
            <div>
              <div className="font-black text-2xl tracking-tighter text-gray-900 leading-none">OMNI</div>
              <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Next-Gen Manager</div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8">
          <div className="space-y-1">
            <div className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Workspace</div>
            {NAV_ITEMS.filter(i => ['root', 'recent', 'starred'].includes(i.id)).map(item => (
              <button
                key={item.id}
                onClick={() => { setCurrentNav(item.id); setPath([]); setAiResults(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${currentNav === item.id && path.length === 0 ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50 text-gray-500'}`}
              >
                {item.icon} {item.label}
              </button>
            ))}
            <button
                onClick={() => { setCurrentNav('drive'); setPath([]); setAiResults(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${currentNav === 'drive' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-500'}`}
              >
                <Cloud size={18} /> My Google Drive
                <div className="ml-auto w-2 h-2 bg-emerald-500 rounded-full shadow-sm"></div>
            </button>
            <button
                onClick={() => { setCurrentNav('ai-gallery'); setPath([]); setAiResults(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${currentNav === 'ai-gallery' ? 'bg-purple-50 text-purple-600' : 'hover:bg-gray-50 text-gray-500'}`}
              >
                <Palette size={18} /> AI Studio Art
            </button>
          </div>

          <div className="space-y-1">
            <div className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex justify-between items-center">
              <span>GitHub Hub</span>
              <button onClick={() => {
                const u = prompt("Sync external repository (User):");
                if(u) { setGithubUsers([...githubUsers, u]); syncUserRepos(u); }
              }} className="p-1 hover:bg-indigo-50 rounded-lg text-indigo-600"><UserPlus size={14}/></button>
            </div>
            {githubUsers.map(user => (
              <button
                key={user}
                onClick={() => { setCurrentNav(`gh-${user}`); setPath([]); setAiResults(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${currentNav === `gh-${user}` ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-gray-50 text-gray-500'}`}
              >
                <Github size={18}/> {user}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 pt-4 border-t border-gray-100 bg-gray-50/30">
             <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-600 text-white shadow-lg shadow-indigo-100`}>
                   <User size={18}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-900 truncate">{loginEmail.split('@')[0] || 'Cloud User'}</div>
                  <div className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 size={8}/> Verified Session
                  </div>
                </div>
                <button onClick={handleLogout} className="p-2 text-gray-300 hover:text-red-500 transition-colors" title="Logout"><CloudOff size={14}/></button>
             </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white shadow-2xl relative z-0">
        <header className="h-24 flex items-center justify-between px-10 border-b border-gray-100 bg-white/90 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-6 min-w-0">
            {path.length > 0 && (
              <button onClick={() => setPath(path.slice(0, -1))} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400">
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="font-black text-2xl text-gray-900 tracking-tight">
                {NAV_ITEMS.find(n => n.id === currentNav)?.label || currentNav.replace('gh-', '')}
              </span>
              {path.map((folderId) => {
                const folderName = files.find(f => f.id === folderId)?.name || 'Folder';
                return (
                  <React.Fragment key={folderId}>
                    <ChevronRight size={20} className="text-gray-200 shrink-0" />
                    <span className="font-bold text-gray-400 text-lg whitespace-nowrap truncate max-w-[150px]">{folderName}</span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 rounded-[28px] px-7 py-3.5 w-[450px] focus-within:bg-white focus-within:ring-[10px] focus-within:ring-indigo-50/50 transition-all border border-transparent focus-within:border-indigo-100 group shadow-inner">
              <Search size={18} className="text-gray-400 mr-4 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text"
                placeholder="Ask OMNI about your cloud documents..."
                className="bg-transparent border-none outline-none text-sm w-full font-bold text-gray-700 placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
              />
              <Sparkles size={16} className={`ml-3 transition-all ${isSearching ? 'text-indigo-500 animate-spin-slow' : 'text-gray-300'}`} />
            </div>
            <button 
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : viewMode === 'grid' ? 'gallery' : 'list')}
              className="p-3.5 bg-gray-50 text-gray-400 rounded-2xl hover:text-gray-900 transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 border border-transparent hover:border-gray-200"
            >
              {viewMode === 'list' ? <List size={18}/> : viewMode === 'grid' ? <LayoutGrid size={18}/> : <ImageIcon size={18}/>}
              <span className="hidden lg:inline">{viewMode}</span>
            </button>
          </div>
        </header>

        {selectedFile && (
          <div className="mx-10 mt-6 p-6 rounded-[36px] bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 text-white flex items-center gap-10 animate-in slide-in-from-top-6 duration-700 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[28px] flex items-center justify-center text-white shrink-0 shadow-lg border border-white/20">
              {React.cloneElement(getFileIcon(selectedFile.type, false) as React.ReactElement, { size: 40 })}
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-3 mb-2">
                 <span className="text-[10px] font-black uppercase text-indigo-100 tracking-widest px-3 py-1 bg-white/20 rounded-full border border-white/10 flex items-center gap-2">
                   {selectedFile.source === 'google-drive' ? <Cloud size={10}/> : selectedFile.source === 'github' ? <Github size={10}/> : <HardDrive size={10}/>}
                   {selectedFile.source} Content
                 </span>
                 <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{formatSize(selectedFile.size)}</span>
               </div>
               <h3 className="font-black text-2xl text-white truncate drop-shadow-sm">{selectedFile.name}</h3>
               <p className="text-sm text-indigo-100/80 mt-2 line-clamp-1 italic font-medium">
                 {selectedFile.aiSummary || "OMNI Brain is distilling the essence of this file..."}
               </p>
            </div>
            <div className="flex gap-4 relative z-10">
               <button onClick={() => openFileViewer(selectedFile)} className="px-8 py-4 bg-white text-indigo-600 rounded-3xl font-black text-xs uppercase tracking-[0.1em] shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center gap-3">
                 <Eye size={18}/> Insight Preview
               </button>
               <button onClick={() => setSelectedIds([])} className="p-4 bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-full transition-colors hover:bg-white/20"><X size={20}/></button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-10 scroll-smooth">
          {filteredFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-48 h-48 bg-gray-50 rounded-[60px] flex items-center justify-center mb-10 border border-gray-100/50 shadow-inner">
                <Globe size={80} className="text-gray-200" />
              </div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tight">Cloud region empty</h2>
              <p className="text-base text-gray-400 mt-4 max-w-sm font-medium leading-relaxed italic">Upload local work or sync your cloud hubs to manifest data here.</p>
            </div>
          ) : (
            <div className={`grid gap-10 ${
              viewMode === 'list' ? 'grid-cols-1' : 
              viewMode === 'gallery' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' :
              'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
            }`}>
              {filteredFiles.map(file => (
                <div 
                  key={file.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if(e.ctrlKey || e.metaKey) setSelectedIds(prev => prev.includes(file.id) ? prev.filter(i => i !== file.id) : [...prev, file.id]);
                    else setSelectedIds([file.id]);
                  }}
                  onDoubleClick={() => file.type === FileType.FOLDER ? handleFolderClick(file) : openFileViewer(file)}
                  className={`group relative flex flex-col p-6 rounded-[40px] border-2 transition-all cursor-pointer ${
                    selectedIds.includes(file.id) 
                    ? 'bg-white border-indigo-600 ring-[12px] ring-indigo-50/50 scale-105 shadow-2xl z-10' 
                    : 'bg-white border-transparent hover:border-gray-100 hover:shadow-xl'
                  }`}
                >
                  <div className="absolute top-5 right-5 flex gap-2">
                    {file.source === 'google-drive' && <Cloud size={14} className="text-blue-400 drop-shadow-sm"/>}
                    {file.source === 'github' && <Github size={14} className="text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"/>}
                    {file.source === 'ai' && <Sparkles size={14} className="text-purple-500 animate-pulse"/>}
                  </div>
                  
                  <div className={`flex-1 mb-6 rounded-[30px] flex items-center justify-center transition-transform group-hover:scale-110 overflow-hidden bg-gray-50 aspect-square shadow-inner`}>
                    {file.type === FileType.IMAGE && file.content ? (
                      <img src={file.content} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      React.cloneElement(getFileIcon(file.type) as React.ReactElement, { size: 56 })
                    )}
                  </div>
                  
                  <div className="px-1">
                    <span className="text-sm font-black text-gray-900 truncate block text-center leading-tight">{file.name}</span>
                    <div className="flex items-center justify-center gap-2 mt-2">
                       <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                         {file.type === FileType.FOLDER ? 'Folder' : formatSize(file.size)}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="h-32 px-12 border-t border-gray-100 bg-white/90 backdrop-blur-2xl flex items-center justify-between z-30">
           <div className="flex gap-5">
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="flex items-center gap-4 px-10 py-5 bg-gray-900 text-white rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
             >
               <FileUp size={22}/> Local Files
             </button>
             <button onClick={() => setIsStudioOpen(true)} className="px-10 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[32px] font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4">
               <Palette size={22}/> Creative Studio
             </button>
           </div>
           
           <div className="flex items-center gap-5">
             <button 
               onClick={() => setIsBrainOpen(true)}
               className="p-5 bg-white border border-gray-100 text-indigo-600 rounded-full shadow-lg hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-90"
             >
               <Brain size={28} className="animate-pulse" />
             </button>
             <button className={`px-16 py-5 rounded-[32px] font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 ${
               selectedIds.length > 0 ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-110 active:scale-100' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
             }`} disabled={selectedIds.length === 0}>
               Analyze Hub
             </button>
           </div>
        </footer>
      </main>

      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[300] flex items-stretch p-12 animate-in fade-in duration-500">
           <div className="bg-white rounded-[60px] shadow-2xl w-full flex overflow-hidden border border-white/10">
              <div className="flex-1 flex flex-col min-w-0">
                <div className="h-28 px-12 border-b border-gray-100 flex items-center justify-between bg-white relative">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-gray-50 rounded-3xl shadow-inner">{getFileIcon(previewFile.type)}</div>
                    <div>
                      <h2 className="font-black text-3xl text-gray-900 leading-tight tracking-tight">{previewFile.name}</h2>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">{previewFile.source} Connection</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatSize(previewFile.size)}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setPreviewFile(null)} className="p-5 bg-red-500 text-white rounded-3xl hover:bg-red-600 transition-all shadow-xl shadow-red-100 active:scale-90 ml-6"><X size={28}/></button>
                </div>
                
                <div className="flex-1 overflow-auto bg-gray-50 p-16 relative">
                  {isLoadingContent ? (
                    <div className="h-full flex items-center justify-center flex-col gap-8">
                      <div className="relative">
                        <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <Brain size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" />
                      </div>
                      <span className="text-sm font-black uppercase text-indigo-600 tracking-[0.3em] animate-pulse">Retrieving Data...</span>
                    </div>
                  ) : previewFile.type === FileType.IMAGE ? (
                    <div className="h-full flex items-center justify-center">
                      <img src={previewContent || ""} className="max-w-full max-h-[70vh] object-contain rounded-[40px] shadow-2xl border-[16px] border-white" />
                    </div>
                  ) : (
                    <div className="max-w-5xl mx-auto bg-white rounded-[48px] shadow-2xl overflow-hidden border border-gray-100 h-full flex flex-col">
                      <div className="h-16 px-10 bg-[#1e1e2e] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                          <span className="text-[11px] font-black text-[#6272a4] uppercase tracking-[0.2em] ml-6 font-mono">Stream.log</span>
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto bg-[#282a36] p-12 text-gray-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                        {previewContent || "// Content stream initiated. Analyzing..."}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-[480px] border-l border-gray-100 bg-white flex flex-col shrink-0">
                <div className="p-12 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-4 text-indigo-600 mb-10">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-indigo-50"><Brain size={32}/></div>
                    <span className="font-black text-xl uppercase tracking-tighter text-gray-900">Semantic Insight</span>
                  </div>
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                    <h4 className="font-black text-xs text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles size={14}/> Gemini Summary
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed font-medium">
                      {previewFile.aiSummary || "OMNI is analyzing this document context. Semantic data will appear shortly..."}
                    </p>
                  </div>
                </div>
                <div className="flex-1 p-12 overflow-y-auto">
                   <div className="text-center py-10 space-y-8">
                      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-200">
                        <MessageSquare size={32}/>
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">Ask specific questions about this document in the OMNI Brain.</p>
                      <button onClick={() => setIsBrainOpen(true)} className="px-8 py-4 bg-indigo-50 text-indigo-600 rounded-3xl font-black text-xs uppercase tracking-widest border border-indigo-100">Launch Brain</button>
                   </div>
                </div>
                <div className="p-12 border-t border-gray-100">
                   <button className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest">Share Cloud Link</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {isStudioOpen && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-2xl z-[500] flex items-center justify-center p-8 animate-in fade-in">
           <div className="bg-white rounded-[64px] shadow-2xl w-full max-w-3xl overflow-hidden">
              <div className="p-14 bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900 text-white relative">
                <div className="flex items-center gap-8">
                  <div className="p-6 bg-white/10 rounded-[36px] backdrop-blur-3xl border border-white/20 shadow-2xl"><Palette size={56}/></div>
                  <div>
                    <h2 className="text-5xl font-black tracking-tighter">AI Studio</h2>
                    <p className="text-xs text-white/50 font-black uppercase tracking-[0.4em] mt-3">Synthesizing Imagery</p>
                  </div>
                </div>
                <button onClick={() => setIsStudioOpen(false)} className="absolute top-10 right-10 p-4 hover:bg-white/10 rounded-full transition-all active:scale-90"><X size={36}/></button>
              </div>
              <div className="p-16">
                <form onSubmit={handleGenerateImage} className="space-y-12">
                   <textarea 
                     value={studioPrompt}
                     onChange={(e) => setStudioPrompt(e.target.value)}
                     placeholder="Describe your creative vision..."
                     className="w-full h-56 p-10 bg-gray-50 rounded-[48px] border-none outline-none text-gray-800 placeholder:text-gray-300 font-black text-2xl resize-none shadow-inner focus:ring-[20px] focus:ring-indigo-50 transition-all leading-tight"
                   />
                   <button disabled={isGenerating || !studioPrompt.trim()} className="w-full py-8 bg-indigo-600 text-white rounded-[40px] font-black text-xl uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-6">
                     {isGenerating ? <Loader2 className="animate-spin" size={32}/> : <Sparkles size={32}/>} 
                     {isGenerating ? "Manifesting..." : "Generate Masterpiece"}
                   </button>
                </form>
              </div>
           </div>
        </div>
      )}

      <div className={`fixed right-0 top-0 h-full w-[550px] bg-white border-l border-gray-100 shadow-[0_0_120px_rgba(0,0,0,0.15)] transition-transform duration-700 z-[400] flex flex-col ${isBrainOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-12 border-b border-gray-100 bg-[#fbfbfb] flex items-center justify-between">
          <div className="flex items-center gap-6 text-indigo-600">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-indigo-50"><Brain size={36}/></div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-gray-900 leading-none">OMNI BRAIN</h2>
              <p className="text-[10px] text-indigo-500 uppercase font-black tracking-widest mt-2">Unified Neural IQ</p>
            </div>
          </div>
          <button onClick={() => setIsBrainOpen(false)} className="p-5 hover:bg-gray-200 rounded-full text-gray-400 transition-all"><X size={32}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-white">
          {brainChat.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500`}>
              <div className={`max-w-[90%] px-10 py-6 rounded-[40px] text-sm leading-relaxed shadow-sm border font-medium ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none border-transparent' : 'bg-gray-50 text-gray-800 rounded-tl-none border-gray-100'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isBrainThinking && (
            <div className="flex justify-start">
              <div className="bg-gray-50 px-10 py-6 rounded-[40px] rounded-tl-none border border-gray-100 flex gap-4">
                <div className="w-3 h-3 bg-indigo-200 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleBrainSubmit} className="p-12 bg-white border-t border-gray-100">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Inquire about your unified workspace..."
              className="w-full bg-gray-50 border-none outline-none py-7 px-10 rounded-[36px] text-base font-bold text-gray-800 focus:bg-white focus:ring-[14px] focus:ring-indigo-50/50 transition-all pr-24 shadow-inner"
              value={brainInput}
              onChange={(e) => setBrainInput(e.target.value)}
            />
            <button type="submit" className="absolute right-5 top-1/2 -translate-y-1/2 p-5 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all active:scale-90">
              <ArrowLeft className="rotate-180" size={28}/>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
