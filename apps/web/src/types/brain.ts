export type NoteType = "fleeting" | "literature" | "permanent";
export type SourceType = "article" | "book" | "podcast" | "other";
export type NoteStatus = "inbox" | "active" | "on-hold" | "done" | "archived";
export type ParaCategory = "project" | "area" | "resource" | "archive";

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  sourceType?: SourceType;
  status: NoteStatus;
  para?: ParaCategory;
  tags: string[];
  connections: number;
  strength: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultStats {
  total: number;
  permanent: number;
  literature: number;
  fleeting: number;
  pending: number;
  connections: number;
  healthScore: number;
}

export interface AiSuggestion {
  id: string;
  type: "link" | "process" | "expand" | "archive";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}
