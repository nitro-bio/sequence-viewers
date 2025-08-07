declare module "@biowasm/aioli" {
  interface MountOptions {
    name: string;
    data: string;
  }

  interface ToolConfig {
    tool: string;
    version: string;
    program: string;
    reinit: boolean;
  }

  interface AioliOptions {
    debug?: boolean;
  }

  interface FileSystem {
    unlink(path: string): Promise<void>;
    readdir(path: string): Promise<string[]>;
    stat(path: string): Promise<unknown>;
  }

  class Aioli {
    constructor(tools: (string | ToolConfig)[], options?: AioliOptions);
    mount(options: MountOptions): Promise<void>;
    exec(command: string): Promise<string>;
    fs: FileSystem;
  }

  export = Aioli;
}
