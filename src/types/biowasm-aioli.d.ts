declare module "@biowasm/aioli" {
  export interface MountOptions {
    name: string;
    data: string;
  }

  export interface ToolConfig {
    tool: string;
    version: string;
    program?: string;
    loading?: "eager" | "lazy";
    reinit?: boolean;
    urlPrefix?: string;
  }

  export interface AioliOptions {
    urlCDN?: string;
    debug?: boolean;
  }

  export interface FileSystem {
    unlink(path: string): Promise<void>;
    readdir(path: string): Promise<string[]>;
    stat(path: string): Promise<unknown>;
  }

  export interface Aioli {
    mount(options: MountOptions | MountOptions[]): Promise<string[]>;
    exec(command: string): Promise<string>;
    fs: FileSystem;
  }

  export interface AioliConstructor {
    new (
      tools: readonly (string | ToolConfig)[],
      options?: AioliOptions,
    ): Promise<Aioli>;
  }

  const Aioli: AioliConstructor;
  export default Aioli;
}
