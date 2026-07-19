/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  RotateCcw, Sparkles, Sliders, ArrowLeft, FastForward, 
  Tv, Eye, Sun, Settings 
} from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  name: string;
  onProgress?: (seconds: number, total: number) => void;
  onClose: () => void;
  onNextEpisode?: () => void;
  initialProgress?: number; // in seconds
}

export default function VideoPlayer({ 
  url, 
  name, 
  onProgress, 
  onClose, 
  onNextEpisode, 
  initialProgress = 0 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [brightness, setBrightness] = useState<number>(100);
  const [volumeBoost, setVolumeBoost] = useState<boolean>(false);
  const [showControls, setShowControls] = useState(true);
  const [hardwareAccel, setHardwareAccel] = useState(true);
  const [bufferSize, setBufferSize] = useState<'low' | 'normal' | 'high'>('normal');

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after idle
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Initialize stream (standard mp4 vs hls)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxBufferLength: bufferSize === 'low' ? 10 : (bufferSize === 'high' ? 60 : 30),
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (initialProgress > 0) {
            video.currentTime = initialProgress;
          }
          video.play().catch(err => console.log('Auto-play blocked: ', err));
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        if (initialProgress > 0) {
          video.currentTime = initialProgress;
        }
        video.play().catch(err => console.log('Auto-play blocked: ', err));
      }
    } else {
      video.src = url;
      if (initialProgress > 0) {
        video.currentTime = initialProgress;
      }
      video.play().catch(err => console.log('Auto-play blocked: ', err));
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url, bufferSize]);

  // Volume & Speed & Aspect ratio observers
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : (volumeBoost ? Math.min(1, volume * 1.5) : volume);
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [volume, isMuted, playbackSpeed, volumeBoost]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
    resetControlsTimeout();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTime = parseFloat(e.target.value);
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
    resetControlsTimeout();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    
    const dur = videoRef.current.duration || 0;
    setDuration(dur);

    if (onProgress && dur > 0) {
      onProgress(Math.floor(time), Math.floor(dur));
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
    resetControlsTimeout();
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Keyboard controls (Arrow keys for seek / volume, space for play)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetControlsTimeout();
      if (!videoRef.current) return;

      switch(e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.05));
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (!isFullscreen) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFullscreen, volume]);

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden font-sans select-none"
    >
      {/* Video Node */}
      <video
        ref={videoRef}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={handlePlayPause}
        style={{ filter: `brightness(${brightness}%)` }}
        className={`w-full h-full transition-all duration-300 ${
          aspectRatio === 'cover' 
            ? 'object-cover' 
            : aspectRatio === 'fill' 
              ? 'object-fill' 
              : 'object-contain'
        }`}
      />

      {/* Screen Brightness / Status overlays */}
      <div className="absolute inset-0 pointer-events-none bg-black/10 mix-blend-multiply" />

      {/* CUSTOM PLAYER GUI OVERLAY */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/80 flex flex-col justify-between p-6 transition-opacity duration-300 z-10 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <button 
              id="btn-player-close"
              onClick={onClose}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <div className="text-xs text-cyan-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
                <Tv size={12} className="animate-pulse" />
                MIX PICAPAU PLAYER
              </div>
              <h1 className="text-lg md:text-xl font-bold text-white tracking-tight drop-shadow-md">
                {name}
              </h1>
            </div>
          </div>

          {/* Quick HUD specs */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-white/60">
            <span className={`px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1`}>
              <Sparkles size={11} /> HW Acel: {hardwareAccel ? 'ON' : 'OFF'}
            </span>
            <span className="px-2 py-1 rounded bg-white/10 text-white/80">
              HLS Buffer: {bufferSize.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Center Remote UI Assist (if focused) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {!isPlaying && (
            <div className="p-5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 animate-ping">
              <Play size={40} fill="currentColor" />
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex flex-col gap-4 w-full">
          
          {/* Timeline slider (Disabled for purely live streams) */}
          {duration > 0 && (
            <div className="flex items-center gap-4 w-full">
              <span className="text-xs font-mono text-white/80">{formatTime(currentTime)}</span>
              <div className="relative flex-1 group">
                <input
                  id="player-timeline"
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <div 
                  className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg pointer-events-none"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-white/80">{formatTime(duration)}</span>
            </div>
          )}

          {/* Buttons Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            
            {/* Play/Pause & Options */}
            <div className="flex items-center gap-4">
              <button
                id="btn-player-play"
                onClick={handlePlayPause}
                className="p-3.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transform hover:scale-105 transition cursor-pointer"
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>

              {/* Fast Forward 10s */}
              {duration > 0 && (
                <button
                  id="btn-player-ff"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 15);
                    }
                  }}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Avançar 15s"
                >
                  <FastForward size={16} />
                </button>
              )}

              {/* Next Episode Trigger */}
              {onNextEpisode && (
                <button
                  id="btn-player-next"
                  onClick={onNextEpisode}
                  className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FastForward size={14} /> Próximo Episódio
                </button>
              )}

              {/* Volume Controller */}
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <button
                  id="btn-player-mute"
                  onClick={toggleMute}
                  className="text-white hover:text-cyan-400 transition cursor-pointer"
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  id="player-volume-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-16 md:w-24 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <button
                  id="btn-player-boost"
                  onClick={() => setVolumeBoost(!volumeBoost)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition ${
                    volumeBoost 
                      ? 'bg-purple-500 text-white border border-purple-400' 
                      : 'bg-white/10 text-white/50 hover:bg-white/20'
                  }`}
                  title="Amplificador de Volume"
                >
                  BOOST
                </button>
              </div>
            </div>

            {/* Quick config overlays (Aspect Ratio, Brightness, Playback speed, Buffer size) */}
            <div className="flex items-center gap-3">
              
              {/* Aspect Ratio selector */}
              <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10 text-xs">
                <span className="text-white/40 px-1"><Sliders size={12} /></span>
                {(['contain', 'cover', 'fill'] as const).map(mode => (
                  <button
                    key={mode}
                    id={`btn-player-aspect-${mode}`}
                    onClick={() => setAspectRatio(mode)}
                    className={`px-2 py-1 rounded-md uppercase font-semibold text-[10px] transition cursor-pointer ${
                      aspectRatio === mode 
                        ? 'bg-cyan-500 text-slate-950 font-bold' 
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {mode === 'contain' ? '4:3/16:9' : mode === 'cover' ? 'Cortar' : 'Esticar'}
                  </button>
                ))}
              </div>

              {/* Speed selector */}
              <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10 text-xs">
                <span className="text-white/40 px-1"><Settings size={12} /></span>
                {([1, 1.25, 1.5, 2] as const).map(speed => (
                  <button
                    key={speed}
                    id={`btn-player-speed-${speed}`}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] transition cursor-pointer ${
                      playbackSpeed === speed 
                        ? 'bg-purple-500 text-white font-bold' 
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Screen Brightness Control */}
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-xs">
                <Sun size={14} className="text-yellow-400" />
                <input
                  id="player-brightness"
                  type="range"
                  min={50}
                  max={150}
                  step={5}
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-12 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <span className="text-[10px] font-mono text-white/60">{brightness}%</span>
              </div>

              {/* Fullscreen Toggle */}
              <button
                id="btn-player-fs"
                onClick={toggleFullscreen}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white transition cursor-pointer border border-white/15"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
