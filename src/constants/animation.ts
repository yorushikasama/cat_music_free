import { Easing } from "react-native";

/**
 * 动画令牌系统
 * 统一管理动画时长、缓动函数、缩放参数，确保交互一致性
 */
export const animation = {
    duration: {
        /** 按压反馈、开关切换 */
        fast: 150,
        /** 页面过渡、面板展开 */
        normal: 250,
        /** 复杂动画、弹窗出现 */
        slow: 400,
    },
    easing: {
        /** 标准缓动 */
        standard: Easing.bezier(0.25, 0.1, 0.25, 1),
        /** 减速（进入动画） */
        decelerate: Easing.bezier(0, 0, 0.2, 1),
        /** 加速（退出动画） */
        accelerate: Easing.bezier(0.4, 0, 1, 1),
        /** 弹性动画 */
        spring: { friction: 7, tension: 40 },
    },
    scale: {
        /** 按压缩小 */
        pressIn: 0.96,
        /** 释放恢复 */
        pressOut: 1.0,
        /** 悬浮放大（桌面端） */
        hover: 1.02,
    },
} as const;
