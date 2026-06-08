import rpx from "@/utils/rpx";

/**
 * 圆角令牌系统
 * 二次元风格：超大圆角、柔和边缘
 */
export const radius = {
    /** 4px 等效 — 微圆角、Badge、Checkbox */
    xs: rpx(4),
    /** 8px 等效 — 按钮、输入框 */
    sm: rpx(8),
    /** 12px 等效 — 标准卡片、Toast */
    md: rpx(12),
    /** 16px 等效 — 歌单封面、列表分组 */
    lg: rpx(16),
    /** 20px 等效 — 弹窗、面板、二次元标准圆角 */
    xl: rpx(20),
    /** 24px 等效 — 大卡片、音乐栏 */
    xxl: rpx(24),
    /** 28px 等效 — 二次元超大圆角组件 */
    xxxl: rpx(28),
    /** 胶囊按钮、搜索框、Chip、Tag */
    pill: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
