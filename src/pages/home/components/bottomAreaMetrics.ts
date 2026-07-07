import { spacing } from "@/constants/spacing";
import rpx from "@/utils/rpx";

export const HOME_FLOATING_MUSIC_BAR_HEIGHT = rpx(112);
export const HOME_FLOATING_MUSIC_BAR_GAP = spacing.sm;
export const HOME_TAB_BAR_HEIGHT = rpx(144);

export const HOME_BOTTOM_CONTENT_SPACING =
    HOME_FLOATING_MUSIC_BAR_HEIGHT +
    HOME_FLOATING_MUSIC_BAR_GAP +
    HOME_TAB_BAR_HEIGHT +
    spacing.lg;
