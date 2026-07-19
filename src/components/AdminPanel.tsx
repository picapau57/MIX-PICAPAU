/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Tv, Users, Key, FileText, Plus, RefreshCw, Trash2, 
  ShieldAlert, Activity, HardDrive, Cpu, Layers, Play, 
  Search, Check, X, Shield, Calendar, Smartphone, Globe, AlertTriangle
} from 'lucide-react';
import { Playlist, User, Device, ActivationCode, SystemLog, IPTVStats } from '../types.js';

interface AdminPanelProps {
  currentAdmin: User;
  onClose: () => void;
}

export default function AdminPanel({ currentAdmin, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'playlists' | 'users' | 'devices' | 'codes'>('dashboard');

  const [stats, setStats] = useState<IPTVStats>({
    activeUsers: 2,
    onlineUsers: 1,
    offlineUsers: 1,
    connectedDevices: 2,
    channelsCount: 4,
    moviesCount: 3,
    seriesCount: 1,
    playlistsCount: 1,
    categoriesCount: 6,
    cpuUsage: 8,
    memoryUsage: 45,
    storageUsage: 12
  });

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // Search filter states
  const [searchQuery, setSearchQuery] = useState('');

  // Forms states
  const [playlistForm, setPlaylistForm] = useState({
    name: '',
    type: 'm3u' as 'm3u' | 'xtream',
    url: '',
    content: '',
    username: '',
    password: '',
    serverUrl: '',
    refreshInterval: 24
  });

  const [userForm, setUserForm] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    deviceLimit: 2,
    expirationDays: 30
  });

  const [codeForm, setCodeForm] = useState({
    durationDays: 30,
    deviceLimit: 2,
    customCode: ''
  });

  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, uRes, dRes, cRes, lRes] = await Promise.all([
        fetch('/api/playlists'),
        fetch('/api/admin/users'),
        fetch('/api/admin/devices'),
        fetch('/api/admin/codes'),
        fetch('/api/admin/logs')
      ]);

      if (pRes.ok) setPlaylists(await pRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (dRes.ok) setDevices(await dRes.json());
      if (cRes.ok) setCodes(await cRes.json());
      if (lRes.ok) setLogs(await lRes.json());

      await fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      fetchStats();
    }, 10000); // refresh system load graphs every 10s
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  // Create or Update Playlist
  const handlePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistForm.name) return triggerToast('Insira um nome para a playlist.', true);
    if (playlistForm.type === 'm3u' && !playlistForm.url && !playlistForm.content) {
      return triggerToast('Insira um link M3U ou cole o conteúdo M3U.', true);
    }
    if (playlistForm.type === 'xtream' && (!playlistForm.serverUrl || !playlistForm.username || !playlistForm.password)) {
      return triggerToast('Preencha os dados do Xtream Codes (URL, Usuário, Senha).', true);
    }

    setLoading(true);
    try {
      const res = await fetch('/api/playlists/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlistForm)
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast('Playlist carregada e conteúdos organizados com sucesso!');
        setShowAddPlaylist(false);
        setPlaylistForm({
          name: '',
          type: 'm3u',
          url: '',
          content: '',
          username: '',
          password: '',
          serverUrl: '',
          refreshInterval: 24
        });
        loadData();
      } else {
        triggerToast(data.error || 'Erro ao carregar playlist.', true);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (!confirm('Deseja deletar esta playlist e limpar todos os seus canais, filmes e séries?')) return;
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast('Playlist removida com sucesso!');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create or Update User
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) return triggerToast('Nome e E-mail são obrigatórios.', true);

    try {
      const expDate = new Date(Date.now() + userForm.expirationDays * 24 * 60 * 60 * 1000).toISOString();
      const payload = {
        id: userForm.id || undefined,
        name: userForm.name,
        email: userForm.email,
        password: userForm.password || '123456',
        role: userForm.role,
        deviceLimit: userForm.deviceLimit,
        expirationDate: expDate
      };

      const res = await fetch('/api/admin/users/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        triggerToast(userForm.id ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
        setShowAddUser(false);
        setUserForm({ id: '', name: '', email: '', password: '', role: 'user', deviceLimit: 2, expirationDays: 30 });
        loadData();
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Erro ao processar usuário.', true);
      }
    } catch (e: any) {
      triggerToast(e.message, true);
    }
  };

  const handleEditUserClick = (u: User) => {
    setUserForm({
      id: u.id,
      name: u.name,
      email: u.email,
      password: '', // blank to avoid over-riding unless typed
      role: u.role,
      deviceLimit: u.deviceLimit,
      expirationDays: Math.ceil((new Date(u.expirationDate).getTime() - Date.now()) / (1000 * 3600 * 24))
    });
    setShowAddUser(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Deseja realmente deletar este usuário?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast('Usuário removido.');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generate Activation Code
  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codeForm)
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`Código gerado: ${data.code.code}`);
        setCodeForm({ durationDays: 30, deviceLimit: 2, customCode: '' });
        loadData();
      } else {
        triggerToast(data.error || 'Erro ao gerar código.', true);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
    }
  };

  const handleToggleCode = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/codes/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        triggerToast('Status do código de ativação alterado!');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Device Block
  const handleToggleDeviceBlock = async (device: Device) => {
    const nextStatus = device.status === 'active' ? 'blocked' : 'active';
    try {
      const res = await fetch(`/api/admin/devices/${device.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        triggerToast(`Status do dispositivo alterado para ${nextStatus === 'active' ? 'Ativo' : 'Bloqueado'}`);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Remove device
  const handleRemoveDevice = async (id: string) => {
    if (!confirm('Deseja desvincular este dispositivo da conta do cliente?')) return;
    try {
      const res = await fetch(`/api/admin/devices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast('Dispositivo desvinculado com sucesso!');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter lists based on search
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.ipAddress.includes(searchQuery) ||
    d.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCodes = codes.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.usedByEmail && c.usedByEmail.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-[#050505]/98 backdrop-blur-xl text-[#F8FAFC] z-40 flex flex-col font-sans select-none overflow-y-auto">
      
      {/* Banner / Header */}
      <header className="px-6 py-4 bg-[#0A0A0A] border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white font-bold flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Tv size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 font-display">
              MIX PICAPAU <span className="text-[10px] bg-white/10 text-cyan-400 font-semibold px-2 py-0.5 rounded-full border border-white/5 uppercase">PAINEL GERENCIAL</span>
            </h1>
            <p className="text-xs text-slate-500">Administrador ativo: <span className="text-slate-300">{currentAdmin.name}</span></p>
          </div>
        </div>
        
        <button 
          id="btn-admin-close"
          onClick={onClose}
          className="px-4 py-2 bg-[#111] hover:bg-white/5 hover:text-white rounded-lg font-medium text-xs border border-white/5 transition cursor-pointer"
        >
          Fechar Painel
        </button>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 flex-col md:flex-row min-h-0">
        
        {/* Left Drawer-like Menu tabs */}
        <aside className="w-full md:w-64 bg-[#0A0A0A] p-4 border-r border-white/5 flex flex-col gap-1 shrink-0">
          <span className="text-[10px] text-slate-500 font-bold px-3 uppercase tracking-wider mb-2">Menus Principais</span>
          
          <button
            id="tab-admin-dash"
            onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer border ${
              activeTab === 'dashboard' ? 'bg-white/10 text-cyan-400 font-extrabold border-white/10 shadow-lg shadow-cyan-500/5' : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <Activity size={15} /> Painel de Controle
          </button>

          <button
            id="tab-admin-playlists"
            onClick={() => { setActiveTab('playlists'); setSearchQuery(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer border ${
              activeTab === 'playlists' ? 'bg-white/10 text-cyan-400 font-extrabold border-white/10 shadow-lg shadow-cyan-500/5' : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <Layers size={15} /> Playlists M3U / Xtream
          </button>

          <button
            id="tab-admin-users"
            onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer border ${
              activeTab === 'users' ? 'bg-white/10 text-cyan-400 font-extrabold border-white/10 shadow-lg shadow-cyan-500/5' : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <Users size={15} /> Clientes e Acessos
          </button>

          <button
            id="tab-admin-devices"
            onClick={() => { setActiveTab('devices'); setSearchQuery(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer border ${
              activeTab === 'devices' ? 'bg-white/10 text-cyan-400 font-extrabold border-white/10 shadow-lg shadow-cyan-500/5' : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <Smartphone size={15} /> Dispositivos Vinculados
          </button>

          <button
            id="tab-admin-codes"
            onClick={() => { setActiveTab('codes'); setSearchQuery(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer border ${
              activeTab === 'codes' ? 'bg-white/10 text-cyan-400 font-extrabold border-white/10 shadow-lg shadow-cyan-500/5' : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <Key size={15} /> Códigos de Ativação
          </button>

          <div className="mt-8 border-t border-white/5 pt-4 px-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Métricas Rápidas</span>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-500">Clientes Ativos</span>
                <span className="font-bold text-white">{users.length}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-500">Total Telas</span>
                <span className="font-bold text-white">{devices.length}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-500">Vouchers Livres</span>
                <span className="font-bold text-cyan-400">{codes.filter(c => !c.isUsed && c.status === 'active').length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Dynamic Area */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#050505]">
          
          {/* Notifications Toast Panel */}
          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
              <Check size={14} className="shrink-0" /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <X size={14} className="shrink-0" /> {errorMsg}
            </div>
          )}

          {/* TAB 1: DASHBOARD METRICS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Top Cards Bento */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-[#0A0A0A] rounded-2xl border border-white/5 shadow-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Canais de TV</span>
                  <p className="text-2xl font-black mt-1 text-white">{stats.channelsCount}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Sincronizados das M3U</p>
                </div>
                <div className="p-4 bg-[#0A0A0A] rounded-2xl border border-white/5 shadow-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filmes (VOD)</span>
                  <p className="text-2xl font-black mt-1 text-cyan-400">{stats.moviesCount}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Disponíveis sob demanda</p>
                </div>
                <div className="p-4 bg-[#0A0A0A] rounded-2xl border border-white/5 shadow-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Séries Completas</span>
                  <p className="text-2xl font-black mt-1 text-purple-400">{stats.seriesCount}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Com episódios e temporadas</p>
                </div>
                <div className="p-4 bg-[#0A0A0A] rounded-2xl border border-white/5 shadow-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clientes Ativos</span>
                  <p className="text-2xl font-black mt-1 text-blue-400">{stats.activeUsers}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{stats.onlineUsers} dispositivos online agora</p>
                </div>
              </div>

              {/* Hardware Telemetry Monitors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* CPU usage */}
                <div className="p-5 bg-[#0A0A0A] rounded-2xl border border-white/5 shadow-xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5"><Cpu size={14} className="text-cyan-400" /> Carga da CPU</span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{stats.cpuUsage}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#050505] rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all duration-500" style={{ width: `${stats.cpuUsage}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-2">Processamento instantâneo do container</span>
                </div>

                {/* RAM memory */}
                <div className="p-5 bg-[#0A0A0A] rounded-2xl border border-white/5 shadow-xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5"><Activity size={14} className="text-purple-400" /> Memória Consumida</span>
                    <span className="text-xs font-mono text-purple-400 font-bold">{stats.memoryUsage} MB</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (stats.memoryUsage / 256) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-2">Limite livre por thread: 512MB RAM</span>
                </div>

                {/* Storage */}
                <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5"><HardDrive size={14} className="text-emerald-400" /> Armazenamento</span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{stats.storageUsage} MB</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${stats.storageUsage}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-2">Playlists em cache no sistema local</span>
                </div>

              </div>

              {/* System Logs */}
              <div className="p-5 bg-[#0A0A0A] rounded-2xl border border-white/5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-display"><FileText size={14} className="text-cyan-400" /> Registros Recentes do Servidor (Audit Logs)</h3>
                  <button 
                    id="btn-admin-refresh"
                    onClick={loadData}
                    className="p-1.5 rounded bg-[#111] border border-white/5 hover:bg-white/5 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-[11px] bg-[#050505] p-3.5 rounded-xl border border-white/5">
                  {logs.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">Nenhum registro no momento.</p>
                  ) : (
                    logs.map(l => (
                      <div key={l.id} className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-slate-500 shrink-0">{new Date(l.timestamp).toLocaleTimeString()}</span>
                        <span className={`font-semibold shrink-0 uppercase ${
                          l.type === 'error' ? 'text-rose-400' : l.type === 'warning' ? 'text-yellow-400' : 'text-cyan-400'
                        }`}>
                          [{l.type}]
                        </span>
                        <span className="text-slate-300 break-all">{l.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PLAYLIST MANAGEMENT */}
          {activeTab === 'playlists' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-white font-display">Gerenciar Fontes e Playlists M3U</h2>
                  <p className="text-xs text-slate-500">Insira, organize ou agende o escaneamento de canais.</p>
                </div>
                <button
                  id="btn-add-playlist"
                  onClick={() => setShowAddPlaylist(!showAddPlaylist)}
                  className="px-4 py-2 bg-gradient-to-br from-cyan-500 to-purple-600 hover:opacity-90 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-500/10"
                >
                  <Plus size={14} /> Importar Playlist
                </button>
              </div>

              {/* Add Playlist Form Drawer */}
              {showAddPlaylist && (
                <form onSubmit={handlePlaylistSubmit} className="p-5 bg-[#0A0A0A] rounded-2xl border border-white/5 space-y-4 shadow-xl">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">Configurar Nova Playlist</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome de Identificação</label>
                      <input 
                        id="form-playlist-name"
                        type="text" 
                        value={playlistForm.name} 
                        onChange={e => setPlaylistForm({...playlistForm, name: e.target.value})}
                        placeholder="Ex: Canais Oficiais Mix PicaPau" 
                        className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Conexão</label>
                      <select 
                        id="form-playlist-type"
                        value={playlistForm.type} 
                        onChange={e => setPlaylistForm({...playlistForm, type: e.target.value as 'm3u' | 'xtream'})}
                        className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                      >
                        <option value="m3u">Link M3U / Arquivo Texto</option>
                        <option value="xtream">Painel Xtream Codes API</option>
                      </select>
                    </div>
                  </div>

                  {playlistForm.type === 'm3u' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">URL da Playlist (.m3u/.m3u8)</label>
                        <input 
                          id="form-playlist-url"
                          type="url" 
                          value={playlistForm.url} 
                          onChange={e => setPlaylistForm({...playlistForm, url: e.target.value})}
                          placeholder="https://servidoriptv.com/get.php?auth=123" 
                          className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div className="text-center text-[10px] text-slate-500 uppercase font-black">OU</div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Colar Conteúdo Bruto do M3U</label>
                        <textarea 
                          id="form-playlist-content"
                          value={playlistForm.content} 
                          onChange={e => setPlaylistForm({...playlistForm, content: e.target.value})}
                          rows={4}
                          placeholder="#EXTM3U&#10;#EXTINF:-1 group-title=&quot;Canais&quot;,Canal Exemplo&#10;http://link.com/stream.m3u8"
                          className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">URL do Servidor Xtream</label>
                        <input 
                          id="form-xtream-server"
                          type="url" 
                          value={playlistForm.serverUrl} 
                          onChange={e => setPlaylistForm({...playlistForm, serverUrl: e.target.value})}
                          placeholder="http://painel.xtream.vip:8080" 
                          className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Usuário / Login</label>
                        <input 
                          id="form-xtream-user"
                          type="text" 
                          value={playlistForm.username} 
                          onChange={e => setPlaylistForm({...playlistForm, username: e.target.value})}
                          placeholder="cliente" 
                          className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Senha</label>
                        <input 
                          id="form-xtream-pass"
                          type="password" 
                          value={playlistForm.password} 
                          onChange={e => setPlaylistForm({...playlistForm, password: e.target.value})}
                          placeholder="******" 
                          className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      id="btn-cancel-playlist"
                      type="button" 
                      onClick={() => setShowAddPlaylist(false)}
                      className="px-4 py-2 bg-[#111] hover:bg-white/5 text-slate-200 border border-white/5 rounded-lg text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      id="btn-save-playlist"
                      type="submit" 
                      disabled={loading}
                      className="px-4 py-2 bg-gradient-to-br from-cyan-500 to-purple-600 hover:opacity-90 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow-lg shadow-cyan-500/10"
                    >
                      {loading ? 'Processando Playlist...' : 'Iniciar Sincronização'}
                    </button>
                  </div>
                </form>
              )}

              {/* Playlists Ledger */}
              <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#050505] text-slate-400 border-b border-white/5">
                      <th className="p-4 font-bold uppercase tracking-wider">Playlist / Nome</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Tipo</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Sincronização</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playlists.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma playlist cadastrada. Importe um link M3U para começar.</td>
                      </tr>
                    ) : (
                      playlists.map(p => (
                        <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                          <td className="p-4">
                            <p className="font-bold text-white">{p.name}</p>
                            <p className="text-[10px] text-slate-500 max-w-xs truncate">{p.url || p.serverUrl || 'Conteúdo manual inserido'}</p>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-white/10 text-cyan-400 font-semibold text-[10px] uppercase border border-white/5">{p.type}</span>
                          </td>
                          <td className="p-4">
                            <p className="text-slate-300">Cada {p.refreshInterval} horas</p>
                            <p className="text-[10px] text-slate-500 font-mono">Última: {new Date(p.lastRefreshed).toLocaleString()}</p>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px] uppercase flex items-center gap-1 w-max">
                              <Check size={10} /> Ativa
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              id={`btn-del-playlist-${p.id}`}
                              onClick={() => handleDeletePlaylist(p.id)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded text-rose-400 transition cursor-pointer"
                              title="Deletar Playlist"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: CUSTOMER / USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-base font-bold text-white font-display">Gerenciar Clientes do IPTV</h2>
                  <p className="text-xs text-slate-500">Cadastre amigos, edite permissões, suspenda acessos ou estenda vigências.</p>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <input 
                      id="admin-user-search"
                      type="text" 
                      placeholder="Buscar cliente..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-[#0A0A0A] border border-white/5 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 w-full"
                    />
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
                  </div>
                  <button
                    id="btn-add-user"
                    onClick={() => setShowAddUser(!showAddUser)}
                    className="px-4 py-2 bg-gradient-to-br from-cyan-500 to-purple-600 hover:opacity-90 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shadow-lg shadow-cyan-500/10"
                  >
                    <Plus size={14} /> Novo Cliente
                  </button>
                </div>
              </div>

              {/* Add User Modal */}
              {showAddUser && (
                <form onSubmit={handleUserSubmit} className="p-5 bg-[#0A0A0A] rounded-2xl border border-white/5 space-y-4 shadow-xl">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">{userForm.id ? 'Editar Dados do Cliente' : 'Cadastrar Novo Cliente'}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome Completo</label>
                      <input 
                        id="form-user-name"
                        type="text" 
                        value={userForm.name} 
                        onChange={e => setUserForm({...userForm, name: e.target.value})}
                        placeholder="Ex: João da Silva" 
                        className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">E-mail (Login)</label>
                      <input 
                        id="form-user-email"
                        type="email" 
                        value={userForm.email} 
                        onChange={e => setUserForm({...userForm, email: e.target.value})}
                        placeholder="joao@gmail.com" 
                        className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Senha de Acesso</label>
                      <input 
                        id="form-user-pass"
                        type="text" 
                        value={userForm.password} 
                        onChange={e => setUserForm({...userForm, password: e.target.value})}
                        placeholder={userForm.id ? 'Manter senha atual' : 'Ex: joao123'} 
                        className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Perfil / Regra</label>
                      <select 
                        id="form-user-role"
                        value={userForm.role} 
                        onChange={e => setUserForm({...userForm, role: e.target.value as 'user' | 'admin'})}
                        className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                      >
                        <option value="user">Cliente Comum</option>
                        <option value="admin">Administrador do Sistema</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Limite de Telas Simultâneas</label>
                      <input 
                        id="form-user-limit"
                        type="number" 
                        min={1} 
                        max={10} 
                        value={userForm.deviceLimit} 
                        onChange={e => setUserForm({...userForm, deviceLimit: parseInt(e.target.value)})}
                        className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dias de Assinatura (A partir de hoje)</label>
                      <input 
                        id="form-user-days"
                        type="number" 
                        min={1} 
                        value={userForm.expirationDays} 
                        onChange={e => setUserForm({...userForm, expirationDays: parseInt(e.target.value)})}
                        className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      id="btn-cancel-user"
                      type="button" 
                      onClick={() => setShowAddUser(false)}
                      className="px-4 py-2 bg-[#111] border border-white/5 hover:bg-white/5 text-slate-200 rounded-lg text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      id="btn-save-user"
                      type="submit" 
                      className="px-4 py-2 bg-gradient-to-br from-cyan-500 to-purple-600 hover:opacity-90 text-white font-bold rounded-lg text-xs cursor-pointer shadow-lg shadow-cyan-500/10"
                    >
                      Salvar Cadastro
                    </button>
                  </div>
                </form>
              )}

              {/* Users Table */}
              <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#050505] text-slate-400 border-b border-white/5">
                      <th className="p-4 font-bold uppercase tracking-wider">Cliente</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Role</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Limite de Telas</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Validade / Expira em</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">Nenhum cliente atende aos critérios de busca.</td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => {
                        const isExpired = new Date(u.expirationDate).getTime() < Date.now();
                        const timeText = isExpired ? 'Assinatura Expirada' : new Date(u.expirationDate).toLocaleDateString();
                        
                        return (
                          <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                            <td className="p-4 flex items-center gap-3">
                              <img src={u.avatar} className="w-8 h-8 rounded-full border border-white/5 object-cover" />
                              <div>
                                <p className="font-bold text-white">{u.name}</p>
                                <p className="text-[10px] text-slate-500">{u.email}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${
                                u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-[#111] border-white/5 text-slate-400'
                              }`}>
                                {u.role === 'admin' ? 'Administrador' : 'Cliente'}
                              </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-300">
                              {u.deviceLimit} Telas
                            </td>
                            <td className="p-4">
                              <p className={`font-semibold ${isExpired ? 'text-rose-400' : 'text-slate-300'}`}>{timeText}</p>
                              {!isExpired && <p className="text-[10px] text-slate-500">Renovar via painel</p>}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                                u.subscriptionStatus === 'active' && !isExpired
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {u.subscriptionStatus === 'active' && !isExpired ? 'Ativo' : u.subscriptionStatus === 'suspended' ? 'Suspenso' : 'Expirado'}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                id={`btn-edit-user-${u.id}`}
                                onClick={() => handleEditUserClick(u)}
                                className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/20 rounded text-cyan-400 font-extrabold transition cursor-pointer text-[10px] uppercase"
                                title="Editar Cadastro"
                              >
                                Editar
                              </button>
                              {u.email !== 'admin@mixpicapau.com' && (
                                <button
                                  id={`btn-del-user-${u.id}`}
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded text-rose-400 transition cursor-pointer border border-rose-500/10"
                                  title="Remover"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 4: CONNECTED DEVICES */}
          {activeTab === 'devices' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-base font-bold text-white font-display">Dispositivos Conectados (Telas)</h2>
                  <p className="text-xs text-slate-500">Verifique os aparelhos ativos por e-mail, IP de origem, bloqueie ou remova IDs.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <input 
                    id="admin-device-search"
                    type="text" 
                    placeholder="Filtrar por nome ou IP..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-[#0A0A0A] border border-white/5 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 w-full"
                  />
                  <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
                </div>
              </div>

              {/* Devices Ledger */}
              <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#050505] text-slate-400 border-b border-white/5">
                      <th className="p-4 font-bold uppercase tracking-wider">Aparelho</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Vínculo Cliente</th>
                      <th className="p-4 font-bold uppercase tracking-wider">IP / Localização</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Último Acesso</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">Nenhum dispositivo encontrado.</td>
                      </tr>
                    ) : (
                      filteredDevices.map(d => {
                        const owner = users.find(u => u.id === d.userId);
                        return (
                          <tr key={d.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                            <td className="p-4">
                              <p className="font-bold text-white flex items-center gap-1.5 capitalize">
                                <Smartphone size={13} className="text-cyan-400" /> {d.name}
                              </p>
                              <p className="text-[10px] text-slate-500 uppercase font-mono">{d.type} - {d.androidVersion}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-semibold text-slate-300">{owner ? owner.name : 'Cliente Desconhecido'}</p>
                              <p className="text-[10px] text-slate-500">{owner ? owner.email : 'Sem e-mail'}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-mono text-slate-300">{d.ipAddress}</p>
                              <p className="text-[10px] text-slate-500 flex items-center gap-1"><Globe size={10} /> {d.country}</p>
                            </td>
                            <td className="p-4 text-slate-400 font-mono">
                              {new Date(d.lastLogin).toLocaleString()}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                                d.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {d.status === 'active' ? 'Liberado' : 'Bloqueado'}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                id={`btn-block-device-${d.id}`}
                                onClick={() => handleToggleDeviceBlock(d)}
                                className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer border ${
                                  d.status === 'active' 
                                    ? 'bg-yellow-500/10 hover:bg-yellow-500 hover:text-slate-950 text-yellow-400 border-yellow-500/20' 
                                    : 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border-emerald-500/20'
                                }`}
                              >
                                {d.status === 'active' ? 'Bloquear' : 'Desbloquear'}
                              </button>
                              <button
                                id={`btn-del-device-${d.id}`}
                                onClick={() => handleRemoveDevice(d.id)}
                                className="p-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded text-rose-400 cursor-pointer border border-rose-500/10"
                                title="Desvincular Aparelho"
                              >
                                <X size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 5: ACTIVATION VOUCHER CODES */}
          {activeTab === 'codes' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Generation Form */}
                <form onSubmit={handleGenerateCode} className="p-5 bg-[#0A0A0A] rounded-2xl border border-white/5 space-y-4 shadow-xl">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display"><Key size={14} className="text-cyan-400" /> Criar Código de Ativação</h3>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dias de Assinatura Liberados</label>
                    <select 
                      id="form-code-days"
                      value={codeForm.durationDays} 
                      onChange={e => setCodeForm({...codeForm, durationDays: parseInt(e.target.value)})}
                      className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value={7}>Teste Grátis (7 dias)</option>
                      <option value={30}>Mensal (30 dias)</option>
                      <option value={90}>Trimestral (90 dias)</option>
                      <option value={180}>Semestral (180 dias)</option>
                      <option value={365}>Anual (365 dias)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Limite de Aparelhos Simultâneos</label>
                    <input 
                      id="form-code-limit"
                      type="number" 
                      min={1} 
                      max={5} 
                      value={codeForm.deviceLimit} 
                      onChange={e => setCodeForm({...codeForm, deviceLimit: parseInt(e.target.value)})}
                      className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Código Personalizado (Opcional)</label>
                    <input 
                      id="form-code-custom"
                      type="text" 
                      placeholder="Ex: PICAPAUEXCLUSIVO" 
                      value={codeForm.customCode} 
                      onChange={e => setCodeForm({...codeForm, customCode: e.target.value})}
                      className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 uppercase"
                    />
                    <span className="text-[9px] text-slate-500 mt-1 block">Deixe em branco para gerar uma string automática segura.</span>
                  </div>

                  <button 
                    id="btn-generate-voucher"
                    type="submit" 
                    className="w-full py-2.5 bg-gradient-to-br from-cyan-500 to-purple-600 hover:opacity-90 text-white font-black rounded-xl text-xs uppercase cursor-pointer shadow-lg shadow-cyan-500/10"
                  >
                    Gerar Novo Voucher
                  </button>
                </form>

                {/* Ledger Index */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">Histórico de Códigos Gerados</h3>
                    <div className="relative w-48">
                      <input 
                        id="admin-code-search"
                        type="text" 
                        placeholder="Pesquisar código..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-[#0A0A0A] border border-white/5 rounded-xl px-3 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:border-cyan-500/50 w-full font-mono"
                      />
                    </div>
                  </div>

                  <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#050505] text-slate-400 border-b border-white/5">
                          <th className="p-4 font-bold uppercase tracking-wider">Voucher / Código</th>
                          <th className="p-4 font-bold uppercase tracking-wider">Plano</th>
                          <th className="p-4 font-bold uppercase tracking-wider">Telas</th>
                          <th className="p-4 font-bold uppercase tracking-wider">Status / Cliente</th>
                          <th className="p-4 font-bold uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCodes.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">Nenhum voucher localizado.</td>
                          </tr>
                        ) : (
                          filteredCodes.map(c => (
                            <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                              <td className="p-4">
                                <span className="font-mono font-black text-cyan-400 select-all tracking-wider text-sm bg-cyan-500/5 px-2.5 py-1 rounded-lg border border-white/5">{c.code}</span>
                                <p className="text-[9px] text-slate-500 mt-1.5 font-mono">Gerado em: {new Date(c.createdAt).toLocaleDateString()}</p>
                              </td>
                              <td className="p-4 font-bold text-slate-300">
                                {c.durationDays} Dias
                              </td>
                              <td className="p-4 text-slate-400 font-bold font-mono">
                                {c.deviceLimit} Telas
                              </td>
                              <td className="p-4">
                                {c.isUsed ? (
                                  <div>
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[9px] uppercase">Utilizado</span>
                                    <p className="text-[10px] text-slate-500 mt-1">{c.usedByEmail}</p>
                                  </div>
                                ) : (
                                  <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase ${
                                    c.status === 'active' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                                  }`}>
                                    {c.status === 'active' ? 'Livre' : 'Desativado'}
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                {!c.isUsed && (
                                  <button
                                    id={`btn-toggle-code-${c.id}`}
                                    onClick={() => handleToggleCode(c.id)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer border ${
                                      c.status === 'active'
                                        ? 'bg-yellow-500/10 hover:bg-yellow-500 hover:text-slate-950 text-yellow-400 border-yellow-500/20'
                                        : 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border-emerald-500/20'
                                    }`}
                                  >
                                    {c.status === 'active' ? 'Desativar' : 'Ativar'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
