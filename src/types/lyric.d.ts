declare namespace ILyric {
    export interface ILyricItem extends IMusic.IMusicItem {
        /** 歌词（无时间戳） */
        rawLrcTxt?: string;
    }

    export interface ILyricSource {
        /** @deprecated 歌词url */
        lrc?: string;
        /** @deprecated 旧插件返回的纯文本歌词 */
        lyric?: string;
        /** 纯文本格式歌词 */
        rawLrc?: string;
        /** @deprecated 旧插件返回的纯文本翻译 */
        trans?: string;
        /** @deprecated 部分平台返回的纯文本翻译 */
        tlyric?: string;
        /** 纯文本格式的翻译 */
        translation?: string;
    }

    export interface IParsedLrcItem {
        /** 时间 s */
        time: number;
        /** 歌词 */
        lrc: string;
        /** 翻译 */
        translation?: string;
        /** 下标 */
        index?: number;
    }

    export type IParsedLrc = IParsedLrcItem[];
}
