import { useI18N } from "@/core/i18n";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import rpx from "@/utils/rpx";
import React from "react";
import { StyleSheet, View } from "react-native";
import ActionButton from "../ActionButton";
import { spacing } from "@/constants/spacing";
import { ImgAsset } from "@/constants/assetsConst";

export default function Operations() {
    const navigate = useNavigate();
    const { t } = useI18N();

    const actionButtons = [
        {
            iconName: "fire",
            acgMascot: ImgAsset.xilianTabIcons.picnic,
            title: t("home.recommendSheet"),
            action() {
                navigate(ROUTE_PATH.RECOMMEND_SHEETS);
            },
        },
        {
            iconName: "trophy",
            acgMascot: ImgAsset.xilianTabIcons.peach,
            title: t("home.topList"),
            action() {
                navigate(ROUTE_PATH.TOP_LIST);
            },
        },
        {
            iconName: "clock-outline",
            acgMascot: ImgAsset.xilianTabIcons.sunset,
            title: t("home.playHistory"),
            action() {
                navigate(ROUTE_PATH.HISTORY);
            },
        },
        {
            iconName: "folder-music-outline",
            acgMascot: ImgAsset.xilianTabIcons.bath,
            title: t("home.localMusic"),
            action() {
                navigate(ROUTE_PATH.LOCAL);
            },
        },
    ] as const;

    return (
        <View style={styles.container}>
            {actionButtons.map((action) => (
                <ActionButton
                    style={styles.actionButtonStyle}
                    key={action.title}
                    {...action}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingHorizontal: spacing.md,
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
        flexDirection: "row",
        gap: spacing.sm,
    },
    actionButtonStyle: {
        flex: 1,
        height: rpx(168),
        borderRadius: rpx(18),
    },
});
