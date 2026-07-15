/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { 
  Tv, Film, Layers, Star, Search, Settings, ArrowUp, ArrowDown, 
  ArrowLeft, ArrowRight, Play, Check, Sparkles, LogOut, Clock, 
  Tv2, Shuffle, Info, Volume2, ShieldAlert
} from 'lucide-react';
import { Channel, Movie, Series, Category, Favorite, User } from '../types.js';

interface TVInterfaceProps {
  user: User;
  onLogout: () => void;
  onPlayMedia: (url: string, name: string) => void;
  onOpenAdmin: () => void;
}

export default function TVInterface({ user, onLogout, onPlayMedia, onOpenAdmin }: TVInterfaceProps) {
  // Navigation Menu tabs
  const MENU_ITEMS = [
    { id: 'live', name: 'TV Ao Vivo', icon: Tv2 },
    { id: 'movies', name: 'Filmes (VOD)', icon: Film },
    { id: 'series', name: 'Séries', icon: Layers },
    { id: 'favorites', name: 'Favoritos', icon: Star },
    { id: 'search', name: 'Busca Global', icon: Search },
    { id: 'settings', name: 'Ajustes', icon: Settings }
  ] as const;

  const [activeMenu, setActiveMenu] = useState<'live' | 'movies' | 'series' | 'favorites' | 'search' | 'settings'>('live');
  
  // Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  // Focus simulation
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected detail modal
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [mediaType, setMediaType] = useState<'channel' | 'movie' | 'series' | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetching data
  const loadContent = async () => {
    try {
      const [catRes, chRes, movRes, serRes, favRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/channels'),
        fetch('/api/movies'),
        fetch('/api/series'),
        fetch(`/api/favorites/${user.id}`)
      ]);

      if (catRes.ok) setCategories(await catRes.json());
      if (chRes.ok) setChannels(await chRes.json());
      if (movRes.ok) setMovies(await movRes.json());
      if (serRes.ok) setSeries(await serRes.json());
      if (favRes.ok) setFavorites(await favRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadContent();
  }, [user.id]);

  // Handle Favorites toggle
  const toggleFavorite = async (id: string, type: 'channel' | 'movie' | 'series') => {
    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, contentId: id, contentType: type })
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
        // update modal state if open
        if (selectedMedia && selectedMedia.id === id) {
          setSelectedMedia({ ...selectedMedia, isFav: !selectedMedia.isFav });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isFavorite = (id: string) => {
    return favorites.some(f => f.contentId === id);
  };

  // AI Enrich Metadata via Gemini API
  const handleAIEnrich = async (media: any) => {
    setEnriching(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/media/enrich-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: media.name, type: mediaType })
      });
      if (res.ok) {
        const enriched = await res.json();
        const updated = {
          ...media,
          description: enriched.description || media.description,
          year: enriched.year || media.year,
          rating: enriched.rating || media.rating,
          genre: enriched.genre || media.genre,
          cast: enriched.cast || media.cast,
          director: enriched.director || media.director,
          aiEnriched: true,
          aiWarning: enriched.warning
        };
        setSelectedMedia(updated);
        
        // update internal list state so it stays enriched for this session
        if (mediaType === 'movie') {
          setMovies(movies.map(m => m.id === media.id ? { ...m, ...updated } : m));
        } else if (mediaType === 'series') {
          setSeries(series.map(s => s.id === media.id ? { ...s, ...updated } : s));
        }
      } else {
        setErrorMsg('Serviço de IA ocupado. Tente novamente.');
      }
    } catch (e: any) {
      setErrorMsg('Falha de rede ao conectar com a IA.');
    } finally {
      setEnriching(false);
    }
  };

  // Filter computations
  const currentCategories = categories.filter(c => {
    if (activeMenu === 'live') return c.type === 'channel';
    if (activeMenu === 'movies') return c.type === 'movie';
    if (activeMenu === 'series') return c.type === 'series';
    return false;
  });

  const getFilteredItems = () => {
    if (activeMenu === 'live') {
      return activeCategoryFilter === 'all' 
        ? channels 
        : channels.filter(c => c.categoryId === activeCategoryFilter);
    }
    if (activeMenu === 'movies') {
      return activeCategoryFilter === 'all' 
        ? movies 
        : movies.filter(m => m.categoryId === activeCategoryFilter);
    }
    if (activeMenu === 'series') {
      return activeCategoryFilter === 'all' 
        ? series 
        : series.filter(s => s.categoryId === activeCategoryFilter);
    }
    if (activeMenu === 'favorites') {
      // return consolidated media objects
      const favChannels = channels.filter(c => isFavorite(c.id)).map(c => ({...c, mediaType: 'channel' as const}));
      const favMovies = movies.filter(m => isFavorite(m.id)).map(m => ({...m, mediaType: 'movie' as const}));
      const favSeries = series.filter(s => isFavorite(s.id)).map(s => ({...s, mediaType: 'series' as const}));
      return [...favChannels, ...favMovies, ...favSeries];
    }
    if (activeMenu === 'search') {
      if (!searchQuery) return [];
      const chFilter = channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => ({...c, mediaType: 'channel' as const}));
      const movFilter = movies.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(m => ({...m, mediaType: 'movie' as const}));
      const serFilter = series.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => ({...s, mediaType: 'series' as const}));
      return [...chFilter, ...movFilter, ...serFilter];
    }
    return [];
  };

  const filteredItems = getFilteredItems();

  // Smart TV Remote Controller button click hooks
  const sendRemoteKey = (key: string) => {
    const itemsCount = filteredItems.length;
    if (itemsCount === 0) return;

    if (key === 'ArrowRight') {
      setFocusedIndex(prev => Math.min(itemsCount - 1, prev + 1));
    } else if (key === 'ArrowLeft') {
      setFocusedIndex(prev => Math.max(0, prev - 1));
    } else if (key === 'ArrowDown') {
      // Go down standard row logic or skip
      setFocusedIndex(prev => Math.min(itemsCount - 1, prev + 4));
    } else if (key === 'ArrowUp') {
      setFocusedIndex(prev => Math.max(0, prev - 4));
    } else if (key === 'Enter') {
      const activeItem = filteredItems[focusedIndex];
      if (activeItem) {
        handleOpenMediaDetails(activeItem);
      }
    } else if (key === 'Back') {
      if (selectedMedia) {
        setSelectedMedia(null);
      } else {
        // Go back to first option
        setFocusedIndex(0);
      }
    }
  };

  // Keyboard observer for remote controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowRight') sendRemoteKey('ArrowRight');
        if (e.key === 'ArrowLeft') sendRemoteKey('ArrowLeft');
        if (e.key === 'ArrowDown') sendRemoteKey('ArrowDown');
        if (e.key === 'ArrowUp') sendRemoteKey('ArrowUp');
        if (e.key === 'Enter') sendRemoteKey('Enter');
        if (e.key === 'Backspace') sendRemoteKey('Back');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, focusedIndex, selectedMedia]);

  const handleOpenMediaDetails = (item: any) => {
    // Detect item type
    let type: 'channel' | 'movie' | 'series' = 'channel';
    if ('duration' in item) type = 'movie';
    else if ('genre' in item && !('url' in item)) type = 'series';
    else if (item.mediaType) type = item.mediaType;

    setMediaType(type);
    setSelectedMedia({
      ...item,
      isFav: isFavorite(item.id)
    });
  };

  const handlePlaySelected = () => {
    if (!selectedMedia) return;
    if (mediaType === 'series') {
      // Play first episode
      const firstEpUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      onPlayMedia(firstEpUrl, `${selectedMedia.name} - S01E01`);
    } else {
      onPlayMedia(selectedMedia.url, selectedMedia.name);
    }
    setSelectedMedia(null);
  };

  return (
    <div className="flex flex-1 flex-col bg-[#050505] font-sans min-h-screen text-[#F8FAFC] p-4 md:p-6 select-none relative overflow-x-hidden">
      
      {/* Background Cinematic Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* top HUD bar */}
      <header className="flex items-center justify-between py-2 mb-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 text-white font-extrabold tracking-tighter text-xs flex items-center gap-1 font-display shadow-lg shadow-cyan-500/10">
            <Tv size={14} /> PICAPAU MIX TV
          </div>
          <span className="hidden sm:inline text-xs text-slate-500 flex items-center gap-1 font-mono">
            <Clock size={11} /> MODO TELEVISÃO ATIVO
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-white uppercase">{user.name}</p>
            <p className="text-[10px] text-cyan-400 tracking-wider font-semibold font-mono">Sessão Segura</p>
          </div>
          
          {user.role === 'admin' && (
            <button
              id="btn-tv-admin"
              onClick={onOpenAdmin}
              className="px-3 py-1.5 bg-gradient-to-br from-purple-600 to-purple-800 text-white font-bold rounded-lg text-[11px] uppercase transition cursor-pointer border border-white/10 hover:brightness-110 shadow-lg shadow-purple-500/10"
            >
              Painel Admin
            </button>
          )}

          <button
            id="btn-tv-logout"
            onClick={onLogout}
            className="p-2 bg-[#111] hover:bg-rose-600/10 text-slate-400 hover:text-rose-400 rounded-lg border border-white/5 transition cursor-pointer"
            title="Sair da Conta"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main split: Menu lists on left, Cards grids in center, simulated remote on right */}
      <div className="flex flex-1 flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Side TV Drawer */}
        <nav className="w-full lg:w-56 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 bg-[#0A0A0A] p-2 rounded-2xl border border-white/5 shadow-xl">
          {MENU_ITEMS.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                id={`btn-tv-menu-${m.id}`}
                onClick={() => {
                  setActiveMenu(m.id as any);
                  setActiveCategoryFilter('all');
                  setFocusedIndex(0);
                }}
                className={`flex-1 lg:flex-initial text-left px-3.5 py-3 rounded-xl text-xs font-bold flex items-center gap-3 transition cursor-pointer border whitespace-nowrap ${
                  activeMenu === m.id 
                    ? 'bg-white/10 text-cyan-400 font-extrabold border-white/10 shadow-lg shadow-cyan-500/5' 
                    : 'text-slate-400 bg-transparent border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{m.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Center Canvas */}
        <div className="flex-1 min-w-0 space-y-4">
                 {/* Categories Horizontal Carousel filter for channel/movies/series */}
          {['live', 'movies', 'series'].includes(activeMenu) && currentCategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                id="btn-cat-filter-all"
                onClick={() => { setActiveCategoryFilter('all'); setFocusedIndex(0); }}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase border transition cursor-pointer ${
                  activeCategoryFilter === 'all'
                    ? 'bg-white/10 text-cyan-400 border-white/10 shadow-lg shadow-cyan-500/5'
                    : 'bg-[#0A0A0A] text-slate-400 border-white/5 hover:bg-white/5'
                }`}
              >
                Todos
              </button>
              {currentCategories.map(cat => (
                <button
                  key={cat.id}
                  id={`btn-cat-filter-${cat.id}`}
                  onClick={() => { setActiveCategoryFilter(cat.id); setFocusedIndex(0); }}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase border transition cursor-pointer whitespace-nowrap ${
                    activeCategoryFilter === cat.id
                      ? 'bg-white/10 text-cyan-400 border-white/10 shadow-lg shadow-cyan-500/5'
                      : 'bg-[#0A0A0A] text-slate-400 border-white/5 hover:bg-white/5'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Search query layout */}
          {activeMenu === 'search' && (
            <div className="relative">
              <input 
                id="tv-search-input"
                type="text" 
                placeholder="Escreva o nome do canal, filme ou série..." 
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setFocusedIndex(0); }}
                className="w-full bg-[#0A0A0A]/60 border border-white/5 rounded-2xl px-5 py-3 pl-12 text-sm text-[#F8FAFC] focus:outline-none focus:border-cyan-500/50"
              />
              <Search className="absolute left-4 top-4 text-slate-500" size={16} />
            </div>
          )}

          {/* Quick Remote keyboard assist help banner */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0A0A0A] text-[10px] text-slate-500 border border-white/5">
            <span className="font-bold text-white uppercase bg-white/10 px-1.5 py-0.5 rounded border border-white/5">Setas Teclado</span> para mover, 
            <span className="font-bold text-white uppercase bg-white/10 px-1.5 py-0.5 rounded border border-white/5">Enter</span> para selecionar,
            <span className="font-bold text-white uppercase bg-white/10 px-1.5 py-0.5 rounded border border-white/5">Backspace</span> para voltar.
          </div>

          {/* Grid of rounded high-density glassmorphism cards */}
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0A0A0A]/40 border border-white/5 flex flex-col items-center justify-center">
              <Shuffle size={32} className="text-slate-700 mb-2 animate-pulse" />
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nenhum conteúdo nesta categoria</p>
              <p className="text-[10px] text-slate-600 mt-1 max-w-xs">Insira novas playlists no painel de administração para enriquecer sua grade.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map((item, idx) => {
                const isFocused = idx === focusedIndex;
                const isLive = activeMenu === 'live' || item.mediaType === 'channel';
                
                return (
                  <div
                    key={item.id}
                    id={`tv-media-card-${item.id}`}
                    onClick={() => {
                      setFocusedIndex(idx);
                      handleOpenMediaDetails(item);
                    }}
                    className={`relative rounded-2xl overflow-hidden cursor-pointer bg-[#0A0A0A] border transition-all duration-300 transform ${
                      isFocused 
                        ? 'border-cyan-500/60 bg-[#111] scale-[1.03] ring-4 ring-cyan-500/10 shadow-2xl shadow-cyan-500/5' 
                        : 'border-white/5 hover:border-white/10 hover:scale-[1.01]'
                    }`}
                  >
                    
                    {/* Aspect ratio handling: live channels vs movies posters */}
                    <div className={`relative w-full ${isLive ? 'aspect-video' : 'aspect-[2/3]'} bg-[#050505]`}>
                      <img 
                        src={isLive ? item.logo : item.poster} 
                        alt={item.name} 
                        className="w-full h-full object-cover transition-transform duration-500" 
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Live Indicator tag */}
                      {isLive && (
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-rose-600 text-[8px] font-black uppercase text-white shadow-[0_0_8px_rgba(225,29,72,0.6)] tracking-widest flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> AO VIVO
                        </span>
                      )}

                      {/* Favorite indicator banner */}
                      {isFavorite(item.id) && (
                        <span className="absolute top-2 right-2 p-1 rounded bg-[#050505]/90 text-yellow-400 border border-white/5">
                          <Star size={10} fill="currentColor" />
                        </span>
                      )}
                    </div>

                    {/* Metadata text overlay */}
                    <div className="p-3">
                      <p className="font-bold text-xs truncate text-white">{item.name}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5 truncate uppercase tracking-tight">{item.categoryName}</p>
                      
                      {!isLive && item.rating && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[9px] px-1 bg-cyan-500/10 text-cyan-400 rounded border border-white/5 font-bold">{item.rating.toFixed(1)}</span>
                          <span className="text-[9px] text-slate-500 font-semibold">{item.year || '2024'}</span>
                        </div>
                      )}
                    </div>

                    {/* Focused active ring overlay */}
                    {isFocused && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-cyan-500 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Right Side Simulated Remote Control Overlay */}
        <aside className="w-full lg:w-48 shrink-0 bg-[#0A0A0A] p-4 rounded-3xl border border-white/5 flex flex-col items-center shadow-xl">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Controle Virtual</span>
          
          {/* Simulated remote joystick */}
          <div className="w-32 h-32 relative bg-[#050505] rounded-full border border-white/5 p-2 flex items-center justify-center shadow-inner">
            
            <button 
              id="remote-up"
              onClick={() => sendRemoteKey('ArrowUp')}
              className="absolute top-1 transform hover:text-cyan-400 active:scale-95 text-slate-500 cursor-pointer p-1 transition"
            >
              <ArrowUp size={18} />
            </button>

            <button 
              id="remote-down"
              onClick={() => sendRemoteKey('ArrowDown')}
              className="absolute bottom-1 transform hover:text-cyan-400 active:scale-95 text-slate-500 cursor-pointer p-1 transition"
            >
              <ArrowDown size={18} />
            </button>

            <button 
              id="remote-left"
              onClick={() => sendRemoteKey('ArrowLeft')}
              className="absolute left-1 transform hover:text-cyan-400 active:scale-95 text-slate-500 cursor-pointer p-1 transition"
            >
              <ArrowLeft size={18} />
            </button>

            <button 
              id="remote-right"
              onClick={() => sendRemoteKey('ArrowRight')}
              className="absolute right-1 transform hover:text-cyan-400 active:scale-95 text-slate-500 cursor-pointer p-1 transition"
            >
              <ArrowRight size={18} />
            </button>

            {/* OK / Enter button */}
            <button 
              id="remote-ok"
              onClick={() => sendRemoteKey('Enter')}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 hover:opacity-90 text-slate-950 font-extrabold text-[11px] uppercase tracking-wide flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-all cursor-pointer transform active:scale-90"
            >
              OK
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 w-full">
            <button
              id="remote-back"
              onClick={() => sendRemoteKey('Back')}
              className="py-2 px-3 bg-[#111] hover:bg-white/5 rounded-xl text-[10px] font-bold text-slate-300 border border-white/5 flex items-center justify-center gap-1 cursor-pointer transition"
            >
              Voltar
            </button>
            <button
              id="remote-home"
              onClick={() => { setFocusedIndex(0); setSelectedMedia(null); }}
              className="py-2 px-3 bg-[#111] hover:bg-white/5 rounded-xl text-[10px] font-bold text-slate-300 border border-white/5 flex items-center justify-center gap-1 cursor-pointer transition"
            >
              Início
            </button>
          </div>

          <p className="text-[9px] text-slate-500 text-center mt-4 uppercase font-black leading-tight">Navigue clicando no joystick ou usando as setas do teclado</p>
        </aside>

      </div>

      {/* SELECTED MEDIA DETAILS MODAL (EPG/SINOPSES) */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden relative flex flex-col md:flex-row shadow-2xl">
            
            {/* Poster side */}
            <div className="w-full md:w-56 shrink-0 aspect-[2/3] md:aspect-auto bg-black relative">
              <img 
                src={mediaType === 'channel' ? selectedMedia.logo : selectedMedia.poster} 
                className="w-full h-full object-cover" 
                alt={selectedMedia.name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent" />
            </div>

            {/* Description Details side */}
            <div className="p-6 flex flex-col justify-between flex-1 min-w-0">
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold text-[9px] uppercase tracking-wider">{mediaType}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">{selectedMedia.categoryName}</span>
                </div>

                <h3 className="text-xl font-bold text-white tracking-tight">{selectedMedia.name}</h3>

                <p className="text-xs text-slate-300 leading-relaxed max-h-40 overflow-y-auto">
                  {selectedMedia.description || 'Nenhuma descrição adicionada.'}
                </p>

                {/* Director/Cast lists for movies & series */}
                {mediaType !== 'channel' && (
                  <div className="text-[10px] space-y-1 text-slate-400 border-t border-white/5 pt-3">
                    <p><span className="font-bold text-slate-300">Diretor:</span> {selectedMedia.director || 'N/A'}</p>
                    <p className="truncate"><span className="font-bold text-slate-300">Elenco:</span> {selectedMedia.cast || 'N/A'}</p>
                  </div>
                )}

                {/* AI Warning disclaimer */}
                {selectedMedia.aiWarning && (
                  <div className="p-2.5 rounded bg-yellow-500/10 text-yellow-300 text-[9px] border border-yellow-500/20 flex items-start gap-1.5">
                    <ShieldAlert size={12} className="shrink-0 mt-0.5" />
                    <span>{selectedMedia.aiWarning}</span>
                  </div>
                )}
              </div>

              {/* Actions Footer row */}
              <div className="flex flex-wrap gap-2.5 pt-4 mt-4 border-t border-white/5">
                <button
                  id="btn-play-media-launch"
                  onClick={handlePlaySelected}
                  className="flex-1 py-2 bg-gradient-to-br from-cyan-500 to-purple-600 hover:opacity-90 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5 transition transform active:scale-95 shadow-lg shadow-cyan-500/20"
                >
                  <Play size={14} fill="currentColor" /> Assistir Agora
                </button>

                <button
                  id="btn-media-fav-toggle"
                  onClick={() => toggleFavorite(selectedMedia.id, mediaType!)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center ${
                    selectedMedia.isFav
                      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      : 'bg-[#050505] text-slate-500 border-white/5 hover:text-white hover:border-white/10'
                  }`}
                  title={selectedMedia.isFav ? 'Remover dos Favoritos' : 'Favoritar'}
                >
                  <Star size={14} fill={selectedMedia.isFav ? 'currentColor' : 'none'} />
                </button>

                {/* AI Enrichment option */}
                {mediaType !== 'channel' && !selectedMedia.aiEnriched && (
                  <button
                    id="btn-ai-enrich"
                    disabled={enriching}
                    onClick={() => handleAIEnrich(selectedMedia)}
                    className="px-3 py-2 bg-purple-600/15 text-purple-300 hover:bg-purple-600 hover:text-white rounded-xl text-xs font-bold border border-purple-500/25 transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    title="Enriquecer informações usando inteligência artificial Gemini"
                  >
                    <Sparkles size={12} className={enriching ? 'animate-spin' : ''} /> {enriching ? 'IA Lendo...' : 'Enriquecer IA'}
                  </button>
                )}

                <button
                  id="btn-media-close"
                  onClick={() => setSelectedMedia(null)}
                  className="px-4 py-2 bg-[#111] hover:bg-white/5 text-slate-200 rounded-xl text-xs font-bold border border-white/5 cursor-pointer transition shrink-0"
                >
                  Fechar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
