export interface ModificationFileChange {
  path: string;
  content: string;
}

export interface ModificationResult {
  success: boolean;
  explanation: string;
  changes: ModificationFileChange[];
}