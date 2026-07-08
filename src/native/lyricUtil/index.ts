import Config from "@/core/appConfig";
import Toast from "@/utils/toast";
import { NativeEventEmitter, NativeModule, NativeModules } from "react-native";
import { errorLog } from "@/utils/log.ts";
import { IAppConfigProperties } from "@/types/core/config";

export enum NativeTextAlignment {
    // 左对齐
    LEFT = 3,
    // 右对齐
    RIGHT = 5,
    // 居中
    CENTER = 17,
}

// 状态栏歌词的工具
interface ILyricUtil extends NativeModule {
    /** 显示状态栏歌词 */
    showStatusBarLyric: (
        initLyric?: string,
        config?: Record<string, any>,
    ) => Promise<void>;
    /** 隐藏状态栏歌词 */
    hideStatusBarLyric: () => Promise<void>;
    /** 设置歌词文本 */
    setStatusBarLyricText: (lyric: string) => Promise<void>;
    /** 设置距离顶部的距离 */
    setStatusBarLyricTop: (percent: number) => Promise<void>;
    /** 设置距离左部的距离 */
    setStatusBarLyricLeft: (percent: number) => Promise<void>;
    /** 设置宽度 */
    setStatusBarLyricWidth: (percent: number) => Promise<void>;
    /** 设置字体 */
    setStatusBarLyricFontSize: (fontSize: number) => Promise<void>;
    /** 设置对齐 */
    setStatusBarLyricAlign: (alignment: NativeTextAlignment) => Promise<void>;
    /** 设置颜色 */
    setStatusBarColors: (
        textColor: string | null,
        backgroundColor: string | null,
    ) => Promise<void>;
    /** 设置桌面歌词锁定 */
    setStatusBarLyricLocked: (locked: boolean) => Promise<void>;
    /** 设置桌面歌词单双行 */
    setStatusBarLyricMode: (
        mode: IAppConfigProperties["lyric.mode"],
    ) => Promise<void>;
    /** 设置桌面歌词样式 */
    setStatusBarLyricStyle: (
        style: IAppConfigProperties["lyric.style"],
    ) => Promise<void>;
    /** 设置无歌词时的显示策略 */
    setStatusBarLyricEmptyBehavior: (
        behavior: IAppConfigProperties["lyric.emptyBehavior"],
        fallbackText?: string,
    ) => Promise<void>;
    /** 设置暂停态显示 */
    setStatusBarLyricPaused: (paused: boolean) => Promise<void>;
    /** 设置桌面歌词前台服务保活 */
    setStatusBarLyricKeepAlive: (enabled: boolean) => Promise<void>;
    /** 检查权限 */
    checkSystemAlertPermission: () => Promise<boolean>;
    /** 请求悬浮窗 */
    requestSystemAlertPermission: () => Promise<boolean>;
}

const LyricUtil: ILyricUtil = NativeModules.LyricUtil;
const lyricEventEmitter = new NativeEventEmitter(LyricUtil);

const originalShowStatusBarLyric = LyricUtil.showStatusBarLyric;

const showStatusBarLyric: ILyricUtil["showStatusBarLyric"] = async (
    initLyric,
    config,
) => {
    try {
        await originalShowStatusBarLyric(initLyric, config);
    } catch (e) {
        errorLog("状态栏歌词开启失败", e);
        Toast.warn("状态栏歌词开启失败，请到手机系统设置打开悬浮窗权限");
        Config.setConfig("lyric.showStatusBarLyric", false);
    }
};

LyricUtil.showStatusBarLyric = showStatusBarLyric;

export function getStatusBarLyricConfig() {
    return {
        topPercent: Config.getConfig("lyric.topPercent"),
        leftPercent: Config.getConfig("lyric.leftPercent"),
        align: Config.getConfig("lyric.align"),
        color: Config.getConfig("lyric.color"),
        backgroundColor: Config.getConfig("lyric.backgroundColor"),
        widthPercent: Config.getConfig("lyric.widthPercent"),
        fontSize: Config.getConfig("lyric.fontSize"),
        locked: Config.getConfig("lyric.locked") ?? true,
        mode: Config.getConfig("lyric.mode") ?? "double",
        style: Config.getConfig("lyric.style") ?? "glass",
        emptyBehavior: Config.getConfig("lyric.emptyBehavior") ?? "track",
        keepAlive: Config.getConfig("lyric.keepAlive") ?? true,
    };
}

export function addStatusBarLyricPositionListener(
    listener: (position: { leftPercent: number; topPercent: number }) => void,
) {
    return lyricEventEmitter.addListener(
        "StatusBarLyricPositionChanged",
        listener,
    );
}

export function addStatusBarLyricLockedListener(
    listener: (payload: { locked: boolean }) => void,
) {
    return lyricEventEmitter.addListener(
        "StatusBarLyricLockedChanged",
        listener,
    );
}

export default LyricUtil;
