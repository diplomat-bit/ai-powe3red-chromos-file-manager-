
import React from 'react';
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive, 
  File,
  Clock,
  Star,
  Trash2,
  HardDrive,
  Cloud,
  Cpu,
  Smartphone
} from 'lucide-react';
import { FileType } from './types';
import { str } from './lib/loadTimeData';

export const ICON_TYPES = {
  ANDROID_FILES: "android_files",
  ARCHIVE: "archive",
  AUDIO: "audio",
  CROSTINI: "crostini",
  DOWNLOADS: "downloads",
  DRIVE: "drive",
  FOLDER: "folder",
  GENERIC: "generic",
  IMAGE: "image",
  MY_FILES: "my_files",
  RECENT: "recent",
  STAR: "star",
  TRASH: "trash",
  VIDEO: "video",
  CLOUD: "cloud"
};

export const NAV_ITEMS = [
  { id: 'recent', label: str('RECENT_ROOT_LABEL'), icon: <Clock size={18} />, section: 'top' },
  { id: 'starred', label: 'Starred', icon: <Star size={18} />, section: 'top' },
  { id: 'root', label: str('MY_FILES_ROOT_LABEL'), icon: <HardDrive size={18} />, section: 'my_files' },
  { id: 'drive', label: str('DRIVE_DIRECTORY_LABEL'), icon: <Cloud size={18} />, section: 'google_drive' },
  { id: 'linux', label: str('LINUX_FILES_ROOT_LABEL'), icon: <Cpu size={18} />, section: 'my_files' },
  { id: 'android', label: str('ANDROID_FILES_ROOT_LABEL'), icon: <Smartphone size={18} />, section: 'my_files' },
  { id: 'trash', label: str('TRASH_ROOT_LABEL'), icon: <Trash2 size={18} />, section: 'trash' },
];

export const getFileIcon = (type: FileType, color: boolean = true) => {
  const props = { size: 20, className: color ? "" : "text-gray-500" };
  switch (type) {
    case FileType.FOLDER: return <Folder {...props} className={color ? "text-blue-500 fill-blue-500/10" : ""} />;
    case FileType.IMAGE: return <ImageIcon {...props} className={color ? "text-red-400" : ""} />;
    case FileType.VIDEO: return <Video {...props} className={color ? "text-red-500" : ""} />;
    case FileType.AUDIO: return <Music {...props} className={color ? "text-orange-400" : ""} />;
    case FileType.DOCUMENT: return <FileText {...props} className={color ? "text-blue-400" : ""} />;
    case FileType.ARCHIVE: return <Archive {...props} className={color ? "text-amber-500" : ""} />;
    default: return <File {...props} />;
  }
};

export const formatSize = (bytes: number | null): string => {
  if (bytes === null) return '--';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
