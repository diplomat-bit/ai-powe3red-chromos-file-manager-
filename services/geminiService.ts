
import { GoogleGenAI, Type } from "@google/genai";
import { FileItem, FileType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates an image based on text prompt.
 */
export async function generateAIImage(prompt: string): Promise<{ dataUrl: string; caption: string }> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    let dataUrl = "";
    let caption = "";

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        dataUrl = `data:image/png;base64,${part.inlineData.data}`;
      } else if (part.text) {
        caption = part.text;
      }
    }

    if (!dataUrl) throw new Error("No image data received");
    return { dataUrl, caption };
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
}

export async function indexFile(file: FileItem): Promise<{ summary: string; keywords: string[] }> {
  try {
    const parts: any[] = [];
    if (file.content && file.mimeType) {
      const isImage = file.mimeType.startsWith('image/');
      const isPdf = file.mimeType === 'application/pdf';
      if (isImage || isPdf) {
        const base64Data = file.content.includes('base64,') ? file.content.split('base64,')[1] : file.content;
        parts.push({ inlineData: { data: base64Data, mimeType: file.mimeType } });
      }
    }

    const textPrompt = `Analyze this ${file.source} file. 
    Name: ${file.name}
    Type: ${file.type}
    Return JSON: {"summary": "1-2 sentence description", "keywords": ["tag1", "tag2", "tag3", "tag4", "tag5"]}`;
    
    parts.push({ text: textPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    return JSON.parse(response.text || '{"summary": "No summary available", "keywords": []}');
  } catch (error) {
    return { summary: "Error indexing file", keywords: [] };
  }
}

export async function queryKnowledgeBase(query: string, files: FileItem[]): Promise<string> {
  const context = files
    .filter(f => f.aiSummary)
    .map(f => `[File: ${f.name} (Source: ${f.source})] Summary: ${f.aiSummary}`)
    .join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `You are the Brain of a integrated workspace. 
    Context:
    ${context || "No files available."}
    
    Question: ${query}`,
  });
  return response.text || "No response.";
}

export async function smartSearch(query: string, files: FileItem[]): Promise<string[]> {
  try {
    const fileList = files.map(f => ({ id: f.id, name: f.name, summary: f.aiSummary }));
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search: "${query}". Return IDs for relevant matches: ${JSON.stringify(fileList)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return files.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).map(f => f.id);
  }
}
