
export enum FileType {
  FOLDER = 'folder',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  GENERIC = 'generic'
}

export type FileSource = 'local' | 'github' | 'ai' | 'google-drive';

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  size: number | null;
  lastModified: string;
  parentId: string | null;
  source: FileSource;
  extension?: string;
  mimeType?: string;
  content?: string; // Text, DataURL, or Download URL
  // AI fields
  aiSummary?: string;
  aiKeywords?: string[];
  isIndexing?: boolean;
  // Source metadata
  githubRepo?: string;
  githubOwner?: string;
  githubUrl?: string;
  driveFileId?: string;
  isCloudFolder?: boolean;
}

export interface NavigationState {
  currentPath: string[];
  selectedIds: string[];
  viewMode: 'list' | 'grid' | 'gallery';
}
