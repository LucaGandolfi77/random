interface OpfsCache {
  match(name: string): Promise<Response | undefined>;
  put(name: string, response: Response, progress?: unknown): Promise<void>;
  delete(name: string): Promise<boolean>;
}

function fileNameFor(name: string): string {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const tail = name.split('/').pop() ?? 'file';
  const safeTail = tail.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
  return `${safeTail}.${(hash >>> 0).toString(36)}`;
}

export async function createOpfsCache(directoryName: string): Promise<OpfsCache | null> {
  const storage = navigator.storage as StorageManager & {
    getDirectory?: () => Promise<FileSystemDirectoryHandle>;
  };
  if (storage?.getDirectory === undefined) return null;

  let directory: FileSystemDirectoryHandle;
  try {
    const root = await storage.getDirectory();
    directory = await root.getDirectoryHandle(directoryName, { create: true });
  } catch {
    return null;
  }

  return {
    async match(name: string): Promise<Response | undefined> {
      try {
        const handle = await directory.getFileHandle(fileNameFor(name));
        const file = await handle.getFile();
        return new Response(file, { headers: { 'Content-Length': String(file.size) } });
      } catch {
        return undefined;
      }
    },

    async put(name: string, response: Response): Promise<void> {
      if (response.body === null) {
        const handle = await directory.getFileHandle(fileNameFor(name), { create: true });
        const writable = await handle.createWritable();
        await writable.write(await response.blob());
        await writable.close();
        return;
      }

      const handle = await directory.getFileHandle(fileNameFor(name), { create: true });
      const writable = await handle.createWritable();
      await response.body.pipeTo(writable);
    },

    async delete(name: string): Promise<boolean> {
      try {
        await directory.removeEntry(fileNameFor(name));
        return true;
      } catch {
        return false;
      }
    },
  };
}

export async function removeModelDirectory(directoryName: string): Promise<boolean> {
  const storage = navigator.storage as StorageManager & {
    getDirectory?: () => Promise<FileSystemDirectoryHandle>;
  };
  if (storage?.getDirectory === undefined) return false;
  try {
    const root = await storage.getDirectory();
    await root.removeEntry(directoryName, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

export async function measureOpfsBytes(directoryName: string): Promise<number | null> {
  const storage = navigator.storage as StorageManager & {
    getDirectory?: () => Promise<FileSystemDirectoryHandle>;
  };
  if (storage?.getDirectory === undefined) return null;
  try {
    const root = await storage.getDirectory();
    const directory = await root.getDirectoryHandle(directoryName);
    let total = 0;
    for await (const [name, handle] of directory.entries()) {
      if (handle.kind !== 'file') continue;
      const file = await (handle as FileSystemFileHandle).getFile();
      total += file.size;
      void name;
    }
    return total;
  } catch {
    return null;
  }
}