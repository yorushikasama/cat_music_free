import rpx from "@/utils/rpx";

/**
 * 间距令牌系统
 * 基于 8px 基准网格，所有间距值通过 rpx 适配
 */
export const spacing = {
    /** 4px 等效 — 图标与文字间距、标签内边距 */
    xs: rpx(8),
    /** 8px 等效 — 紧凑内边距、小组件间距 */
    sm: rpx(16),
    /** 12px 等效 — 标准水平内边距、列表项间距 */
    md: rpx(24),
    /** 16px 等效 — 卡片内边距、区块间距 */
    lg: rpx(32),
    /** 20px 等效 — 大区块间距 */
    xl: rpx(40),
    /** 24px 等效 — 页面级间距 */
    xxl: rpx(48),
    /** 32px 等效 — 顶部/底部安全区域外间距 */
    xxxl: rpx(64),
} as const;

export type SpacingKey = keyof typeof spacing;
