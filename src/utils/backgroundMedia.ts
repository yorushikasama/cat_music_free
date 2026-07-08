const VIDEO_EXTENSIONS = new Set([
    "mp4",
    "mov",
    "m4v",
    "webm",
    "mkv",
    "avi",
    "3gp",
]);

export function getMediaExtension(url?: string) {
    if (!url) {
        return "";
    }
    const cleanUrl = url.split(/[?#]/)[0];
    const dotIndex = cleanUrl.lastIndexOf(".");
    if (dotIndex < 0) {
        return "";
    }
    return cleanUrl.slice(dotIndex + 1).toLowerCase();
}

export function isVideoBackgroundUrl(url?: string) {
    return VIDEO_EXTENSIONS.has(getMediaExtension(url));
}
