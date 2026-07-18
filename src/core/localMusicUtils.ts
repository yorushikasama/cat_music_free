import { getMediaUniqueKey } from "@/utils/mediaUtils";

interface ILocalMusicFileEntry {
    path: string;
    isDirectory(): boolean;
}

export function mergeUniqueLocalMusic(
    existing: IMusic.IMusicItem[],
    incoming: IMusic.IMusicItem[],
) {
    const musicKeys = new Set(existing.map(getMediaUniqueKey));
    const merged = [...existing];

    incoming.forEach(music => {
        const key = getMediaUniqueKey(music);
        if (!musicKeys.has(key)) {
            musicKeys.add(key);
            merged.push(music);
        }
    });

    return merged;
}

export async function collectLocalMediaPaths(
    initialFolderPaths: string[],
    readDirectory: (path: string) => Promise<ILocalMusicFileEntry[]>,
    isLocalMedia: (path: string) => boolean,
    shouldContinue: () => boolean,
) {
    const pendingFolders = Array.from(new Set(initialFolderPaths));
    const visitedFolders = new Set(pendingFolders);
    const musicPaths: string[] = [];
    const seenMusicPaths = new Set<string>();

    for (let folderIndex = 0; folderIndex < pendingFolders.length; folderIndex++) {
        if (!shouldContinue()) {
            throw new Error("Import Broken");
        }

        let entries: ILocalMusicFileEntry[] = [];
        try {
            entries = await readDirectory(pendingFolders[folderIndex]);
        } catch {}

        entries.forEach(entry => {
            if (entry.isDirectory()) {
                if (!visitedFolders.has(entry.path)) {
                    visitedFolders.add(entry.path);
                    pendingFolders.push(entry.path);
                }
            } else if (isLocalMedia(entry.path) && !seenMusicPaths.has(entry.path)) {
                seenMusicPaths.add(entry.path);
                musicPaths.push(entry.path);
            }
        });
    }

    return musicPaths;
}
