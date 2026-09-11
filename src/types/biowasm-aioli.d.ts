declare module "@biowasm/aioli" {
  export interface MountOptions {
    name: string;
    data: string;
  }

  export interface WriteOptions {
    path: string;
    buffer: Uint8Array;
    flag?: string;
    offset?: number;
    position?: number;
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
    write(options: WriteOptions): Promise<void>;
    exec(command: string): Promise<string>;
    reinit(tool: string): Promise<void>;
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
