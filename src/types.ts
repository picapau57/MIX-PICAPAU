/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DeviceType = 'tv' | 'tvbox' | 'android' | 'firetv' | 'tablet' | 'phone';
export type UserRole = 'admin' | 'user';
export type SubscriptionStatus = 'active' | 'suspended' | 'expired';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  expirationDate: string;
  deviceLimit: number;
  avatar: string;
  defaultPlayer: 'internal' | 'external';
  autoLogin: boolean;
  favoriteCategories: string[];
}

export interface Device {
  id: string;
  userId: string;
  type: DeviceType;
  name: string;
  androidVersion: string;
  lastLogin: string;
  ipAddress: string;
  country: string;
  status: 'active' | 'blocked';
}

export interface ActivationCode {
  id: string;
  code: string;
  durationDays: number;
  deviceLimit: number;
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
  usedByEmail?: string;
  status: 'active' | 'expired' | 'disabled';
}

export interface Playlist {
  id: string;
  name: string;
  type: 'm3u' | 'xtream' | 'json';
  url?: string;
  username?: string;
  password?: string;
  serverUrl?: string;
  status: 'active' | 'error';
  refreshInterval: number; // in hours
  lastRefreshed: string;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'channel' | 'movie' | 'series';
}

export interface Channel {
  id: string;
  playlistId: string;
  name: string;
  logo: string;
  categoryId: string;
  categoryName: string;
  url: string;
  epgId?: string;
}

export interface Movie {
  id: string;
  playlistId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  url: string;
  poster: string;
  background: string;
  description: string;
  duration: string;
  year: number;
  rating: number;
  genre: string;
  cast: string;
  director: string;
}

export interface Series {
  id: string;
  playlistId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  poster: string;
  background: string;
  description: string;
  rating: number;
  genre: string;
}

export interface Episode {
  id: string;
  seriesId: string;
  name: string;
  url: string;
  season: number;
  episodeNumber: number;
  description: string;
  duration: string;
  thumbnail: string;
}

export interface WatchHistory {
  id: string;
  userId: string;
  contentId: string; // Movie ID, Episode ID, or Channel ID
  contentType: 'movie' | 'episode' | 'channel';
  lastWatched: string;
  progressSeconds: number;
  totalSeconds: number;
}

export interface Favorite {
  id: string;
  userId: string;
  contentId: string;
  contentType: 'movie' | 'series' | 'channel';
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  userEmail?: string;
}

export interface IPTVStats {
  activeUsers: number;
  onlineUsers: number;
  offlineUsers: number;
  connectedDevices: number;
  channelsCount: number;
  moviesCount: number;
  seriesCount: number;
  playlistsCount: number;
  categoriesCount: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
}
