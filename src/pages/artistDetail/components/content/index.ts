import AlbumContentItem from "./albumContentItem";
import MusicContentItem from "./musicContentItem";
import type { ReactElement } from "react";

const content: Record<IArtist.ArtistMediaType, (...args: any) => ReactElement> =
    {
        music: MusicContentItem,
        album: AlbumContentItem,
    } as const;

export default content;
