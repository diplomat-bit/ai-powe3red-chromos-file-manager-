
import { FileItem, FileType } from "../types";

const GITHUB_API = "https://api.github.com";

export async function fetchUserRepos(username: string): Promise<any[]> {
  try {
    const response = await fetch(`${GITHUB_API}/users/${username}/repos?sort=updated&per_page=30`);
    if (!response.ok) throw new Error("User not found");
    return await response.json();
  } catch (error) {
    console.error("GitHub fetch error:", error);
    return [];
  }
}

export async function fetchRepoContents(owner: string, repo: string, path: string = ""): Promise<any[]> {
  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("GitHub contents fetch error:", error);
    return [];
  }
}

export async function fetchRawGithubContent(downloadUrl: string): Promise<string> {
  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) return "Error fetching content.";
    return await response.text();
  } catch (error) {
    return "Failed to load file content.";
  }
}

export function mapGithubToFiles(
  ghItems: any[], 
  parentId: string, 
  owner: string, 
  repoName: string
): FileItem[] {
  return ghItems.map(item => {
    const isRepo = !!item.full_name; // Repos have full_name, contents don't
    const type = (isRepo || item.type === 'dir') ? FileType.FOLDER : FileType.DOCUMENT;
    
    return {
      id: isRepo ? `repo-${item.id}` : `gh-${item.sha || Math.random().toString(36).substr(2, 9)}`,
      name: item.name,
      type: type,
      size: item.size || null,
      lastModified: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : new Date().toLocaleDateString(),
      parentId,
      source: 'github',
      githubOwner: owner,
      githubRepo: isRepo ? item.name : repoName,
      githubUrl: item.html_url,
      content: item.download_url, // Use this to fetch actual text later
      extension: item.name.split('.').pop(),
      mimeType: (isRepo || item.type === 'dir') ? undefined : 'text/plain'
    };
  });
}
