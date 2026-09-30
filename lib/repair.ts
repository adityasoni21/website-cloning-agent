export interface FileChange {
  path: string;
  content?: string;
  delete?: boolean;
}

export interface RepairResult {
  repaired: boolean;
  changes: FileChange[];
  explanation: string;
}

export interface RepairContext {
  projectDirectory: string;
  buildError: string;
}