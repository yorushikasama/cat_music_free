import type { IRecommendationTrackIdentity } from "./musicRecommendationTypes";

function normalizeIdentityPart(value: string | undefined) {
    return (value ?? "")
        .normalize("NFKC")
        .toLocaleLowerCase()
        .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
        .replace(/(?:feat\.?|ft\.?)\s+[^,;/]+/gi, " ")
        .replace(/[\s\-_.，、,;；:/\\|]+/g, " ")
        .trim();
}

export function createMusicRecommendationFingerprint(
    title: string,
    artist: string,
) {
    return `${normalizeIdentityPart(title)}::${normalizeIdentityPart(artist)}`;
}

export function createMusicRecommendationIdentity(
    track: Pick<IRecommendationTrackIdentity, "title" | "artist">,
): IRecommendationTrackIdentity {
    return {
        title: track.title.trim(),
        artist: track.artist.trim(),
        fingerprint: createMusicRecommendationFingerprint(track.title, track.artist),
    };
}

export function isSameMusicRecommendationIdentity(
    left: Pick<IRecommendationTrackIdentity, "title" | "artist">,
    right: Pick<IRecommendationTrackIdentity, "title" | "artist">,
) {
    return (
        createMusicRecommendationFingerprint(left.title, left.artist) ===
        createMusicRecommendationFingerprint(right.title, right.artist)
    );
}
