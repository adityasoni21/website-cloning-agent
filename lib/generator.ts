export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GeneratedProject {
  projectName: string;
  files: GeneratedFile[];
}

export interface CodeGenerator {
  generateProject(
    pageSpec: unknown
  ): Promise<GeneratedProject>;
}