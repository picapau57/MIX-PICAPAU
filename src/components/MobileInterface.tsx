/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Tv, Film, Layers, Star, Search, User, Play, Check, X, 
  Sparkles, History, Compass, Bell, ShieldAlert, Award
} from 'lucide-react';
import { Channel, Movie, Series, Category, Favorite, User as UserType } from '../types.js';

interface MobileInterfaceProps {
  user: UserType;
  onLogout: () => void;
  onPlayMedia: (url: string, name: string) => void;
  onOpenAdmin: () => void;
}

export default function MobileInterface({ user, onLogout, onPlayMedia, onOpenAdmin }: MobileInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'live' | 'movies' | 'series' | 'favorites' | 'profile'>('home');
  
  // Storage states
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  // Selection details
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedType, setSelectedType] = useState<'channel' | 'movie' | 'series' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [enriching, setEnriching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
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
    loadData();
  }, [user.id]);

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
        if (selectedItem && selectedItem.id === id) {
          setSelectedItem({ ...selectedItem, isFav: !selectedItem.isFav });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isFavorite = (id: string) => {
    return favorites.some(f => f.contentId === id);
  };

  // AI Enrich Metadata
  const handleAIEnrich = async (item: any) => {
    setEnriching(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/media/enrich-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.name, type: selectedType })
      });
      if (res.ok) {
        const data = await res.json();
        const updated = {
          ...item,
          description: data.description || item.description,
          year: data.year || item.year,
          rating: data.rating || item.rating,
          genre: data.genre || item.genre,
          cast: data.cast || item.cast,
          director: data.director || item.director,
          aiEnriched: true,
          aiWarning: data.warning
        };
        setSelectedItem(updated);

        // update cached arrays
        if (selectedType === 'movie') {
          setMovies(movies.map(m => m.id === item.id ? { ...m, ...updated } : m));
        } else if (selectedType === 'series') {
          setSeries(series.map(s => s.id === item.id ? { ...s, ...updated } : s));
        }
      } else {
        setErrorMsg('Erro do assistente de IA. Tente mais tarde.');
      }
    } catch (e) {
      setErrorMsg('Falha de conexão com a IA.');
    } finally {
      setEnriching(false);
    }
  };

  const handleOpenItem = (item: any, type: 'channel' | 'movie' | 'series') => {
    setSelectedType(type);
    setSelectedItem({
      ...item,
      isFav: isFavorite(item.id)
    });
  };

  const handlePlaySelected = () => {
    if (!selectedItem) return;
    if (selectedType === 'series') {
      // play first episode
      const sampleUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      onPlayMedia(sampleUrl, `${selectedItem.name} - S01E01`);
    } else {
      onPlayMedia(selectedItem.url, selectedItem.name);
    }
    setSelectedItem(null);
  };

  // Content Filtering
  const filteredChannels = channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMovies = movies.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSeries = series.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const favChannels = channels.filter(c => isFavorite(c.id));
  const favMovies = movies.filter(m => isFavorite(m.id));
  const favSeries = series.filter(s => isFavorite(s.id));

  return (
    <div className="flex flex-1 flex-col bg-[#050505] font-sans min-h-screen text-[#F8FAFC] pb-20 select-none overflow-x-hidden relative">
      
      {/* Search Header banner */}
      <header className="p-4 bg-[#0A0A0A] border-b border-white/5 flex items-center justify-between sticky top-0 z-20 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 text-white font-black shadow-md shadow-cyan-500/10">
            <Tv size={16} />
          </div>
          <span className="text-sm font-black tracking-wider text-white font-display">MIX PICAPAU</span>
        </div>

        <div className="flex items-center gap-2">
          {user.role === 'admin' && (
            <button
              id="btn-mob-admin"
              onClick={onOpenAdmin}
              className="px-2.5 py-1.5 bg-gradient-to-br from-purple-600 to-purple-800 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer border border-white/10 shadow-lg shadow-purple-500/10"
            >
              Admin
            </button>
          )}
          <img src={user.avatar} className="w-8 h-8 rounded-full border border-white/10 object-cover" />
        </div>
      </header>

      {/* Global query input row */}
      {activeTab !== 'profile' && (
        <div className="p-4 shrink-0">
          <div className="relative">
            <input 
              id="mob-search-input"
              type="text" 
              placeholder="Pesquisar canais, filmes ou séries..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-white/5 rounded-2xl py-2.5 px-4 pl-10 text-xs text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
            <Search className="absolute left-3.5 top-3.5 text-slate-500" size={13} />
          </div>
        </div>
      )}

      {/* TAB CONTROLS RENDERING */}

      {/* TAB 1: HOME COMPILATION */}
      {activeTab === 'home' && (
        <div className="px-4 space-y-6">
          
          {/* Quick Info card banner */}
          <div className="p-4 bg-gradient-to-br from-cyan-500/5 to-[#0A0A0A] rounded-3xl border border-white/5 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1"><Award size={10} /> Plano Premium Ativo</p>
              <h3 className="text-sm font-extrabold mt-1 text-white font-display">Olá, {user.name}!</h3>
              <p className="text-[10px] text-slate-505 mt-0.5">Aproveite mais de {channels.length + movies.length + series.length} conteúdos completos.</p>
            </div>
            <div className="p-2 bg-white/10 rounded-xl text-cyan-400 font-extrabold text-xs border border-white/5">
              30 DIAS
            </div>
          </div>

          {/* Continuar Assistindo Section */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3 font-display">Continuar Assistindo</span>
            <div className="flex gap-4 overflow-x-auto pb-1.5 scrollbar-none">
              {movies.slice(0, 2).map(m => (
                <div 
                  key={m.id} 
                  id={`mob-resume-${m.id}`}
                  onClick={() => handleOpenItem(m, 'movie')}
                  className="w-64 shrink-0 bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden relative cursor-pointer hover:border-white/10 transition"
                >
                  <div className="aspect-video relative">
                    <img src={m.background} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                      <div className="p-2 rounded-full bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
                        <Play size={12} fill="currentColor" />
                      </div>
                    </div>
                    {/* timeline indicator mockup */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-[#050505]">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="font-bold text-xs truncate text-white">{m.name}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">Parou em: 04:12</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Canais Recomendados Section */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3 font-display">Canais Recomendados</span>
            <div className="grid grid-cols-2 gap-3">
              {channels.slice(0, 4).map(c => (
                <div 
                  key={c.id}
                  id={`mob-rec-channel-${c.id}`}
                  onClick={() => handleOpenItem(c, 'channel')}
                  className="p-2 bg-[#0A0A0A] rounded-2xl border border-white/5 flex items-center gap-2.5 cursor-pointer hover:border-white/10 transition"
                >
                  <img src={c.logo} className="w-10 h-10 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate text-white">{c.name}</p>
                    <p className="text-[9px] text-slate-500 truncate uppercase">{c.categoryName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* VOD Novidades Filmes Section */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3 font-display">Filmes em Destaque</span>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {movies.map(m => (
                <div 
                  key={m.id}
                  id={`mob-featured-mov-${m.id}`}
                  onClick={() => handleOpenItem(m, 'movie')}
                  className="w-28 shrink-0 bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden cursor-pointer hover:border-white/10 transition"
                >
                  <img src={m.poster} className="aspect-[2/3] object-cover w-full" />
                  <div className="p-2">
                    <p className="font-bold text-[10px] truncate text-white">{m.name}</p>
                    <p className="text-[8px] text-slate-500 truncate">{m.genre}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: LIVE TV CHANNELS */}
      {activeTab === 'live' && (
        <div className="px-4 space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Grade de Canais ({filteredChannels.length})</span>
          <div className="space-y-2">
            {filteredChannels.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">Nenhum canal localizado.</p>
            ) : (
              filteredChannels.map(c => (
                <div 
                  key={c.id}
                  id={`mob-channel-card-${c.id}`}
                  onClick={() => handleOpenItem(c, 'channel')}
                  className="p-3 bg-[#0A0A0A] rounded-2xl border border-white/5 flex items-center justify-between cursor-pointer hover:border-white/10 transition"
                >
                  <div className="flex items-center gap-3">
                    <img src={c.logo} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <p className="font-bold text-xs text-white">{c.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{c.categoryName}</p>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-rose-600 text-[8px] font-black uppercase text-white shadow-[0_0_8px_rgba(225,29,72,0.6)] animate-pulse">AO VIVO</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
            {/* TAB 3: MOVIES */}
      {activeTab === 'movies' && (
        <div className="px-4 space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-display">Cinemas VOD ({filteredMovies.length})</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredMovies.length === 0 ? (
              <p className="text-slate-500 text-xs text-center col-span-full py-8">Nenhum filme localizado.</p>
            ) : (
              filteredMovies.map(m => (
                <div 
                  key={m.id}
                  id={`mob-movie-card-${m.id}`}
                  onClick={() => handleOpenItem(m, 'movie')}
                  className="bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden cursor-pointer hover:border-white/10 transition"
                >
                  <img src={m.poster} className="aspect-[2/3] object-cover w-full" />
                  <div className="p-2">
                    <p className="font-bold text-xs truncate text-white">{m.name}</p>
                    <p className="text-[10px] text-slate-505 truncate">{m.genre}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SERIES */}
      {activeTab === 'series' && (
        <div className="px-4 space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-display">Séries de TV ({filteredSeries.length})</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredSeries.length === 0 ? (
              <p className="text-slate-500 text-xs text-center col-span-full py-8">Nenhuma série localizada.</p>
            ) : (
              filteredSeries.map(s => (
                <div 
                  key={s.id}
                  id={`mob-series-card-${s.id}`}
                  onClick={() => handleOpenItem(s, 'series')}
                  className="bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden cursor-pointer hover:border-white/10 transition"
                >
                  <img src={s.poster} className="aspect-[2/3] object-cover w-full" />
                  <div className="p-2">
                    <p className="font-bold text-xs truncate text-white">{s.name}</p>
                    <p className="text-[10px] text-slate-505 truncate">{s.genre}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: FAVORITES */}
      {activeTab === 'favorites' && (
        <div className="px-4 space-y-6">
          
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Canais Favoritos ({favChannels.length})</span>
            {favChannels.length === 0 ? (
              <p className="text-slate-600 text-xs italic py-2">Sem canais favoritos.</p>
            ) : (
              <div className="space-y-2">
                {favChannels.map(c => (
                  <div 
                    key={c.id} 
                    id={`mob-fav-channel-${c.id}`}
                    onClick={() => handleOpenItem(c, 'channel')}
                    className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img src={c.logo} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <p className="font-bold text-xs text-white">{c.name}</p>
                        <p className="text-[9px] text-slate-500">{c.categoryName}</p>
                      </div>
                    </div>
                    <Star size={12} className="text-yellow-400" fill="currentColor" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Filmes & Séries Favoritos ({favMovies.length + favSeries.length})</span>
            {favMovies.length === 0 && favSeries.length === 0 ? (
              <p className="text-slate-600 text-xs italic py-2">Sem filmes ou séries favoritas.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {favMovies.map(m => (
                  <div 
                    key={m.id}
                    id={`mob-fav-movie-${m.id}`}
                    onClick={() => handleOpenItem(m, 'movie')}
                    className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden cursor-pointer"
                  >
                    <img src={m.poster} className="aspect-[2/3] object-cover w-full" />
                    <div className="p-2 flex justify-between items-center">
                      <p className="font-bold text-[10px] truncate text-white">{m.name}</p>
                      <Star size={10} className="text-yellow-400" fill="currentColor" />
                    </div>
                  </div>
                ))}
                {favSeries.map(s => (
                  <div 
                    key={s.id}
                    id={`mob-fav-series-${s.id}`}
                    onClick={() => handleOpenItem(s, 'series')}
                    className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden cursor-pointer"
                  >
                    <img src={s.poster} className="aspect-[2/3] object-cover w-full" />
                    <div className="p-2 flex justify-between items-center">
                      <p className="font-bold text-[10px] truncate text-white">{s.name}</p>
                      <Star size={10} className="text-yellow-400" fill="currentColor" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 6: PROFILE & SETTINGS */}
      {activeTab === 'profile' && (
        <div className="px-4 space-y-6">
          <div className="p-6 bg-[#0A0A0A] rounded-3xl border border-white/5 text-center relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-2xl rounded-full" />
            <img src={user.avatar} className="w-16 h-16 rounded-full border border-white/10 mx-auto object-cover" />
            
            <h3 className="text-base font-bold text-white mt-3 font-display">{user.name}</h3>
            <p className="text-xs text-slate-500">{user.email}</p>
            
            <span className="inline-block mt-3 px-3 py-1 bg-cyan-500/10 text-cyan-400 font-bold text-[10px] uppercase rounded-full border border-white/5">
              {user.role === 'admin' ? 'Administrador Gerente' : 'Usuário Convidador'}
            </span>
          </div>

          <div className="bg-[#0A0A0A] rounded-3xl border border-white/5 overflow-hidden text-xs shadow-xl">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <span className="text-slate-500">Limite de Aparelhos</span>
              <span className="font-bold text-white">{user.deviceLimit} Telas Simultâneas</span>
            </div>
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <span className="text-slate-500">Expira em</span>
              <span className="font-bold text-white">{new Date(user.expirationDate).toLocaleDateString()}</span>
            </div>
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <span className="text-slate-500">Player Preferencial</span>
              <span className="font-bold text-cyan-400">Interno MIX PICAPAU (HLS)</span>
            </div>
          </div>

          <button
            id="btn-mob-logout"
            onClick={onLogout}
            className="w-full py-3 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-2xl font-bold text-xs uppercase tracking-wide border border-rose-500/20 transition cursor-pointer"
          >
            Sair da Minha Conta
          </button>
        </div>
      )}


      {/* MOBILE CONTENT BOTTOM SHEET DETAILS DIALOG */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-35 flex items-end justify-center">
          <div className="w-full max-w-lg bg-[#0A0A0A] border-t border-white/10 rounded-t-3xl overflow-hidden shadow-2xl p-6 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto">
            
            <div className="flex justify-between items-start">
              <div className="flex gap-2 items-center">
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold text-[8px] uppercase">{selectedType}</span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">{selectedItem.categoryName}</span>
              </div>
              <button 
                id="btn-mob-media-close"
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-full bg-[#111] border border-white/5 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-4">
              <img 
                src={selectedType === 'channel' ? selectedItem.logo : selectedItem.poster} 
                className="w-20 h-28 object-cover rounded-xl border border-white/5 shrink-0" 
              />
              <div className="space-y-1.5">
                <h3 className="font-bold text-sm text-white line-clamp-2 font-display">{selectedItem.name}</h3>
                {selectedItem.rating && (
                  <p className="text-[10px] text-cyan-400 font-black">★ {selectedItem.rating.toFixed(1)} / 10</p>
                )}
                {selectedItem.duration && (
                  <p className="text-[9px] text-slate-500">Duração: {selectedItem.duration}</p>
                )}
                <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">
                  {selectedItem.description || 'Sem descrição.'}
                </p>
              </div>
            </div>

            {selectedItem.aiWarning && (
              <div className="p-2 rounded bg-yellow-500/10 text-yellow-300 text-[9px] border border-yellow-500/15 flex items-start gap-1.5">
                <ShieldAlert size={12} className="shrink-0 mt-0.5" />
                <span>{selectedItem.aiWarning}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                id="btn-mob-media-play"
                onClick={handlePlaySelected}
                className="flex-1 py-2.5 bg-gradient-to-br from-cyan-500 to-purple-600 text-white font-extrabold rounded-xl text-xs uppercase flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <Play size={13} fill="currentColor" /> Assistir
              </button>
              
              <button
                id="btn-mob-media-fav"
                onClick={() => toggleFavorite(selectedItem.id, selectedType!)}
                className={`px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                  selectedItem.isFav 
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' 
                    : 'bg-[#050505] text-slate-500 border-white/5 hover:border-white/10'
                }`}
              >
                <Star size={13} fill={selectedItem.isFav ? 'currentColor' : 'none'} />
              </button>

              {selectedType !== 'channel' && !selectedItem.aiEnriched && (
                <button
                  id="btn-mob-media-ai"
                  disabled={enriching}
                  onClick={() => handleAIEnrich(selectedItem)}
                  className="px-3 py-2.5 bg-purple-600/15 text-purple-300 hover:bg-purple-600 hover:text-white rounded-xl text-xs font-bold border border-purple-500/15 transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Sparkles size={11} className={enriching ? 'animate-spin' : ''} /> {enriching ? 'Enriquecendo...' : 'Enriquecer'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION TABS DOCK */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/5 flex justify-around py-2.5 px-2 z-20 shadow-2xl">
        
        <button
          id="tab-mob-home"
          onClick={() => { setActiveTab('home'); setSearchQuery(''); }}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold cursor-pointer transition ${
            activeTab === 'home' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Compass size={16} /> Início
        </button>

        <button
          id="tab-mob-live"
          onClick={() => { setActiveTab('live'); setSearchQuery(''); }}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold cursor-pointer transition ${
            activeTab === 'live' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Tv size={16} /> Canais TV
        </button>

        <button
          id="tab-mob-movies"
          onClick={() => { setActiveTab('movies'); setSearchQuery(''); }}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold cursor-pointer transition ${
            activeTab === 'movies' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Film size={16} /> Filmes
        </button>

        <button
          id="tab-mob-series"
          onClick={() => { setActiveTab('series'); setSearchQuery(''); }}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold cursor-pointer transition ${
            activeTab === 'series' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Layers size={16} /> Séries
        </button>

        <button
          id="tab-mob-favs"
          onClick={() => { setActiveTab('favorites'); setSearchQuery(''); }}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold cursor-pointer transition ${
            activeTab === 'favorites' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Star size={16} /> Favoritos
        </button>

        <button
          id="tab-mob-profile"
          onClick={() => { setActiveTab('profile'); setSearchQuery(''); }}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold cursor-pointer transition ${
            activeTab === 'profile' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <User size={16} /> Perfil
        </button>

      </nav>

    </div>
  );
}
