import i18n from "@/core/i18n";
import { IIconName } from "@/components/base/icon";
import { ILanguageData } from "@/types/core/i18n";

const iconLabelKeyMap: Partial<Record<IIconName, keyof ILanguageData>> = {
    "arrow-left": "a11y.back",
    "arrow-long-left": "a11y.back",
    "arrow-path": "a11y.refresh",
    "arrows-left-right": "a11y.lyricOffset",
    "ellipsis-vertical": "a11y.moreOptions",
    "folder-plus": "a11y.addToPlaylist",
    "font-size": "a11y.fontSize",
    "heart-outline": "a11y.favorite",
    heart: "a11y.unfavorite",
    "magnifying-glass": "common.search",
    pause: "a11y.pause",
    play: "common.play",
    playlist: "panel.playList.title",
    plus: "a11y.add",
    "question-mark-circle": "a11y.help",
    share: "a11y.share",
    "skip-left": "a11y.previous",
    "skip-right": "a11y.next",
    "trash-outline": "common.delete",
    "x-mark": "a11y.remove",
};

export function getIconAccessibilityLabel(name: IIconName) {
    const key = iconLabelKeyMap[name];
    return key ? i18n.t(key) : name.replace(/-/g, " ");
}
