/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export interface SharedAudioFile {
  name: string;
  data: string;
}

export interface SharedPlayerData {
  image: string | null;
  audioFile: SharedAudioFile;
  createdAt: string;
}

export interface CreateShareRequest {
  image: string | null;
  audioFile: SharedAudioFile;
  expiresInHours?: number;
}

export interface CreateShareResponse {
  id: string;
  playerUrl: string;
  expiresAt: string;
}

export interface SharedPlayerResponse {
  id: string;
  imageUrl: string | null;
  audioUrl: string;
  audioFileName: string;
  createdAt: string;
  expiresAt: string;
}

export interface ManagedShare {
  id: string;
  userId: string;
  audioFileName: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}
