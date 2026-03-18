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
}

export interface CreateShareResponse {
  id: string;
}
