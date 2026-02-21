
import { FileItem, FileType } from "../types";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

export async function fetchDriveFiles(accessToken: string, folderId: string = 'root'): Promise<any[]> {
  // Mock data fallback for demonstration if no real token is provided
  if (accessToken === "demo-token") {
    return getMockDriveFiles(folderId);
  }

  try {
    const q = `'${folderId}' in parents and trashed = false`;
    const response = await fetch(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id, name, mimeType, size, modifiedTime, thumbnailLink)&pageSize=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Drive fetch failed");
    }
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Google Drive API Error:", error);
    // Return empty but allow UI to handle error state if needed
    throw error;
  }
}

export async function fetchDriveFileContent(accessToken: string, fileId: string): Promise<string> {
  if (accessToken === "demo-token") {
    return `Content for mock file ${fileId}. This is a demonstration of the OMNI Workspace unified viewer. 
    
In a real environment with a valid OAuth token, this would be the actual binary or text data from your Google Drive. 
The OMNI Brain would then analyze this text to provide deep semantic insights.`;
  }

  try {
    const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) return "Cannot preview this file type directly (Google Drive API restriction for some file types).";
    return await response.text();
  } catch (error) {
    return "Error loading Drive content.";
  }
}

export function mapDriveToFiles(driveItems: any[], parentId: string): FileItem[] {
  return driveItems.map(item => {
    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
    let type = FileType.DOCUMENT;
    if (isFolder) type = FileType.FOLDER;
    else if (item.mimeType.startsWith('image/')) type = FileType.IMAGE;
    else if (item.mimeType.startsWith('video/')) type = FileType.VIDEO;
    else if (item.mimeType.startsWith('audio/')) type = FileType.AUDIO;

    return {
      id: `drive-${item.id}`,
      driveFileId: item.id,
      name: item.name,
      type,
      size: item.size ? parseInt(item.size) : null,
      lastModified: new Date(item.modifiedTime || Date.now()).toLocaleDateString(),
      parentId,
      source: 'google-drive',
      mimeType: item.mimeType,
      isCloudFolder: isFolder,
      content: item.thumbnailLink 
    };
  });
}

function getMockDriveFiles(folderId: string) {
  if (folderId === 'root') {
    return [
      { id: 'mock-1', name: 'Project Roadmap.gdoc', mimeType: 'application/vnd.google-apps.document', size: '1024', modifiedTime: new Date().toISOString() },
      { id: 'mock-2', name: 'Design Assets', mimeType: 'application/vnd.google-apps.folder', modifiedTime: new Date().toISOString() },
      { id: 'mock-3', name: 'Budget_2024.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: '542000', modifiedTime: new Date().toISOString() },
      { id: 'mock-4', name: 'Presentation.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: '2500000', modifiedTime: new Date().toISOString() },
    ];
  } else if (folderId === 'mock-2') {
    return [
      { id: 'mock-2-1', name: 'Logo_Primary.png', mimeType: 'image/png', size: '150000', modifiedTime: new Date().toISOString() },
      { id: 'mock-2-2', name: 'Icon_Set.zip', mimeType: 'application/zip', size: '8900000', modifiedTime: new Date().toISOString() },
    ];
  }
  return [];
}
