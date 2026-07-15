/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect, useState } from 'react';
import { 
  Tv, Key, User, Eye, EyeOff, Smartphone, Shield, 
  HelpCircle, AlertTriangle, Play, Sparkles, Check, X, ShieldAlert 
} from 'lucide-react';
import TVInterface from './components/TVInterface.tsx';
import MobileInterface from './components/MobileInterface.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import VideoPlayer from './components/VideoPlayer.tsx';
import { User as UserType, Device } from './types.js';

export default function App() {
  // Session states
  const [user, setUser] = useState<UserType | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [activePlayer, setActivePlayer] = useState<{ url: string; name: string } | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  
  // Dual-UI Layout Mode: 'tv' (Smart TV, remote-first) or 'mobile' (smartphone touch tabbed layout)
  const [uiMode, setUiMode] = useState<'tv' | 'mobile'>('tv');

  // Login form states
  const [loginTab, setLoginTab] = useState<'code' | 'traditional'>('code');
  const [activationCode, setActivationCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & notifications
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Device specs mockup simulator
  const [simulatedDevice, setSimulatedDevice] = useState({
    name: 'Chrome OS Web TV',
    type: 'tvbox' as const,
    androidVersion: 'Android TV 11.0',
    ipAddress: '177.34.120.45',
    country: 'Brasil'
  });

  // Load active session from local storage on load
  useEffect(() => {
    const savedUser = localStorage.getItem('picapau_user');
    const savedDevice = localStorage.getItem('picapau_device');
    const savedMode = localStorage.getItem('picapau_ui_mode');

    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedDevice) setDevice(JSON.parse(savedDevice));
    if (savedMode) setUiMode(savedMode as 'tv' | 'mobile');
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

  // Helper: Registers a device for the logged-in user on the server
  const registerDevice = async (userId: string, role: string, deviceLimit: number): Promise<Device | null> => {
    try {
      const type = uiMode === 'tv' ? 'tvbox' : 'phone';
      const name = uiMode === 'tv' ? 'Smart TV Box (Simulação)' : 'Smartphone Android (Simulação)';

      const res = await fetch('/api/auth/register-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type,
          name,
          androidVersion: simulatedDevice.androidVersion,
          ipAddress: simulatedDevice.ipAddress,
          country: simulatedDevice.country
        })
      });

      const data = await res.json();
      if (res.ok) {
        return data.device;
      } else {
        triggerToast(data.error || 'Erro de limite de telas.', true);
        return null;
      }
    } catch (e: any) {
      triggerToast('Falha na comunicação de autenticação do dispositivo.', true);
      return null;
    }
  };

  // Handle Code Activation login
  const handleCodeActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCode.trim()) return triggerToast('Por favor, insira o código de ativação.', true);

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activationCode.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        const activeUser = data.user;
        
        // Register device
        const activeDev = await registerDevice(activeUser.id, activeUser.role, activeUser.deviceLimit);
        if (activeDev) {
          setUser(activeUser);
          setDevice(activeDev);
          localStorage.setItem('picapau_user', JSON.stringify(activeUser));
          localStorage.setItem('picapau_device', JSON.stringify(activeDev));
          triggerToast('Código de ativação aceito! Carregando canais...');
        }
      } else {
        triggerToast(data.error || 'Código inválido ou expirado.', true);
      }
    } catch (e: any) {
      triggerToast('Erro de conexão com o servidor de ativação.', true);
    } finally {
      setLoading(false);
    }
  };

  // Handle traditional Login
  const handleTraditionalLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return triggerToast('Preencha seu e-mail e senha de acesso.', true);
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        const activeUser = data.user;

        // Register device
        const activeDev = await registerDevice(activeUser.id, activeUser.role, activeUser.deviceLimit);
        if (activeDev) {
          setUser(activeUser);
          setDevice(activeDev);
          localStorage.setItem('picapau_user', JSON.stringify(activeUser));
          localStorage.setItem('picapau_device', JSON.stringify(activeDev));
          triggerToast('Acesso autorizado! Bem-vindo de volta.');
        }
      } else {
        triggerToast(data.error || 'Login ou senha incorretos.', true);
      }
    } catch (e: any) {
      triggerToast('Erro ao validar acesso tradicional.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('picapau_user');
    localStorage.removeItem('picapau_device');
    setUser(null);
    setDevice(null);
    setAdminOpen(false);
    setActivePlayer(null);
    triggerToast('Sessão encerrada com segurança.');
  };

  // Switch layouts on key toggle
  const toggleUiMode = () => {
    const nextMode = uiMode === 'tv' ? 'mobile' : 'tv';
    setUiMode(nextMode);
    localStorage.setItem('picapau_ui_mode', nextMode);
    triggerToast(`Modo alterado para ${nextMode === 'tv' ? 'Smart TV Box 📺' : 'Smartphone/Tablet 📱'}`);
  };

  return (
    <div className="bg-[#050505] text-[#F8FAFC] min-h-screen relative font-sans selection:bg-cyan-500/30 selection:text-white">
      
      {/* Dynamic notifications bar overlay */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-[#0A0A0A]/95 border border-emerald-500/20 text-emerald-300 text-xs font-semibold shadow-xl shadow-emerald-500/5 flex items-center gap-2 max-w-sm animate-slide-in backdrop-blur-md">
          <Check size={16} className="text-emerald-400 shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-[#0A0A0A]/95 border border-rose-500/20 text-rose-300 text-xs font-semibold shadow-xl shadow-rose-500/5 flex items-center gap-2 max-w-sm animate-slide-in backdrop-blur-md">
          <ShieldAlert size={16} className="text-rose-400 shrink-0" /> {errorMsg}
        </div>
      )}

      {/* RENDER VIEW: NOT LOGGED IN PORTAL */}
      {!user ? (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#050505] relative overflow-hidden">
          
          {/* Animated Background Orbs */}
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-cyan-500/5 blur-[100px] rounded-full animate-pulse pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-600/5 blur-[100px] rounded-full animate-pulse pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

          {/* Logo Brand Header */}
          <div className="text-center mb-8 shrink-0 z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20 mx-auto">
              <div className="w-full h-full bg-[#050505] rounded-[15px] flex items-center justify-center text-cyan-400 font-extrabold">
                <Tv size={28} className="animate-pulse" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tighter mt-5 text-white font-display">
              PICAPAU <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">MIX</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">SISTEMA ULTRA-LEVE DE IPTV & VOD</p>
          </div>

          {/* Form Box */}
          <div className="w-full max-w-md bg-[#0A0A0A]/60 backdrop-blur-xl rounded-3xl border border-white/5 p-6 md:p-8 shadow-2xl relative z-10">
            
            {/* Tab switch */}
            <div className="grid grid-cols-2 bg-[#050505] p-1 rounded-2xl mb-6 border border-white/5">
              <button
                id="tab-login-code"
                onClick={() => setLoginTab('code')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginTab === 'code' ? 'bg-gradient-to-br from-cyan-500 to-purple-600 text-white font-extrabold shadow-lg shadow-cyan-500/10' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Key size={14} /> Ativação Código
              </button>
              <button
                id="tab-login-trad"
                onClick={() => setLoginTab('traditional')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginTab === 'traditional' ? 'bg-gradient-to-br from-cyan-500 to-purple-600 text-white font-extrabold shadow-lg shadow-cyan-500/10' : 'text-slate-400 hover:text-white'
                }`}
              >
                <User size={14} /> Entrar com E-mail
              </button>
            </div>

            {/* TAB FORM: ACTIVATION CODE */}
            {loginTab === 'code' ? (
              <form onSubmit={handleCodeActivationSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Código de Ativação (Voucher)</label>
                  <div className="relative">
                    <input
                      id="input-activation-code"
                      type="text"
                      placeholder="Ex: PICAPAU50"
                      value={activationCode}
                      onChange={e => setActivationCode(e.target.value.toUpperCase())}
                      className="w-full bg-[#050505] border border-white/5 rounded-2xl px-4 py-3 pl-11 text-sm text-slate-100 placeholder-slate-600 font-black font-mono tracking-widest uppercase focus:outline-none focus:border-cyan-500/50"
                    />
                    <Key size={15} className="absolute left-4 top-3.5 text-slate-600" />
                  </div>
                </div>

                <div className="p-3 bg-[#050505] rounded-2xl border border-white/5 text-[10px] text-slate-400 space-y-1.5 leading-relaxed">
                  <p className="font-bold text-slate-200">ℹ️ Como funciona?</p>
                  <p>Entre com o código de 8 dígitos ou cupom gerado pelo seu administrador. O dispositivo atual será autenticado automaticamente e associado à sua assinatura.</p>
                </div>

                <button
                  id="btn-login-code-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-br from-cyan-500 to-purple-600 hover:opacity-90 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  {loading ? 'Validando Cupom...' : 'Ativar Aparelho'}
                </button>
              </form>
            ) : (
              // TAB FORM: TRADITIONAL LOGIN
              <form onSubmit={handleTraditionalLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">E-mail Cadastrado</label>
                  <div className="relative">
                    <input
                      id="input-login-email"
                      type="email"
                      placeholder="seuemail@gmail.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-[#050505] border border-white/5 rounded-2xl px-4 py-3 pl-11 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                    />
                    <User size={15} className="absolute left-4 top-3.5 text-slate-600" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Senha de Acesso</label>
                  <div className="relative">
                    <input
                      id="input-login-pass"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="******"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-[#050505] border border-white/5 rounded-2xl px-4 py-3 pl-11 pr-11 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      id="btn-login-toggle-pass"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-slate-600 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-login-trad-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-br from-cyan-500 to-purple-600 hover:opacity-90 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  {loading ? 'Autenticando...' : 'Entrar no IPTV'}
                </button>
              </form>
            )}

            {/* Quick Helper presets for Sandbox demonstration */}
            <div className="mt-6 pt-5 border-t border-white/5">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block mb-2 text-center">Demonstração Rápida (Sandbox)</span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button
                  id="btn-preset-admin"
                  onClick={() => { setEmail('admin@picapau.com'); setPassword('admin123'); setLoginTab('traditional'); }}
                  className="p-2 bg-[#050505] hover:bg-white/5 text-[#F8FAFC]/80 rounded-xl border border-white/5 hover:border-cyan-500/30 transition cursor-pointer font-semibold text-center"
                >
                  Entrar como Admin
                </button>
                <button
                  id="btn-preset-voucher"
                  onClick={() => { setActivationCode('PICAPAU50'); setLoginTab('code'); }}
                  className="p-2 bg-[#050505] hover:bg-white/5 text-[#F8FAFC]/80 rounded-xl border border-white/5 hover:border-cyan-500/30 transition cursor-pointer font-semibold text-center"
                >
                  Usar Cupom PICAPAU50
                </button>
              </div>
            </div>

          </div>

          {/* Quick legal footnote */}
          <footer className="mt-8 text-[10px] text-slate-500 max-w-xs text-center leading-relaxed">
            <p>PICAPAU MIX IPTV v2.5. Este software suporta apenas playlists e canais de streaming legalmente autorizados pelo proprietário.</p>
          </footer>

        </div>
      ) : (
        // RENDER VIEW: CHOSEN DUAL UI LAYOUT MODE (TV vs Mobile)
        <div className="min-h-screen">
          {uiMode === 'tv' ? (
            <TVInterface 
              user={user} 
              onLogout={handleLogout} 
              onPlayMedia={(url, name) => setActivePlayer({ url, name })}
              onOpenAdmin={() => setAdminOpen(true)}
            />
          ) : (
            <MobileInterface 
              user={user} 
              onLogout={handleLogout} 
              onPlayMedia={(url, name) => setActivePlayer({ url, name })}
              onOpenAdmin={() => setAdminOpen(true)}
            />
          )}

          {/* FLOATING SYSTEM SWITCHER PORT CONTROLLERS */}
          <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">
            
            {/* UI Layout toggler */}
            <button
              id="btn-system-toggle-layout"
              onClick={toggleUiMode}
              className="px-3.5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase shadow-2xl border border-slate-800 flex items-center gap-1.5 tracking-wider transition cursor-pointer transform hover:scale-105"
              title="Alternar entre visualização TV ou visualização celular"
            >
              {uiMode === 'tv' ? '📱 MODO MOBILE' : '📺 MODO SMART TV'}
            </button>

            {/* Quick Status Info Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-[10px] text-slate-400 border border-slate-800 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>IP: {simulatedDevice.ipAddress} ({simulatedDevice.country})</span>
            </div>
          </div>
        </div>
      )}

      {/* RENDER MODAL: ADMIN CONTROL SUITE OVERLAY */}
      {adminOpen && user && user.role === 'admin' && (
        <AdminPanel 
          currentAdmin={user} 
          onClose={() => setAdminOpen(false)} 
        />
      )}

      {/* RENDER PORTAL: THE CINEMATIC MEDIA PLAYER OVERLAY */}
      {activePlayer && (
        <VideoPlayer 
          url={activePlayer.url} 
          name={activePlayer.name} 
          onClose={() => setActivePlayer(null)}
          onProgress={async (sec, tot) => {
            if (user) {
              // Fire watch progress reporting logs silently to server
              await fetch('/api/history/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.id,
                  contentId: activePlayer.name,
                  contentType: 'movie',
                  progressSeconds: sec,
                  totalSeconds: tot
                })
              });
            }
          }}
        />
      )}

    </div>
  );
}
