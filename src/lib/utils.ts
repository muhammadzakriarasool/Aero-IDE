import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { FileJson, FileCode2, FileText, FileImage, File } from "lucide-react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop() || '';
};

export const getLanguageFromExtension = (ext: string): string => {
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    default:
      return 'typescript';
  }
};

export const getFileIcon = (filename: string) => {
  const ext = getFileExtension(filename);
  switch (ext) {
    case 'json':
      return FileJson;
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return FileCode2;
    case 'css':
    case 'html':
    case 'md':
      return FileText;
    case 'png':
    case 'jpg':
    case 'svg':
      return FileImage;
    default:
      return File;
  }
};
