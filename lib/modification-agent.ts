import type {
  ModificationResult,
} from "./modification";

export interface ModificationAgent {
  modifyProject(
    projectDirectory: string,
    instruction: string
  ): Promise<ModificationResult>;
}