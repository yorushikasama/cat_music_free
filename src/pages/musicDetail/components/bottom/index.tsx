import React from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import SeekBar from "./seekBar";
import PlayControl from "./playControl";
import useOrientation from "@/hooks/useOrientation";
import useColors from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";

export default function Bottom() {
    const orientation = useOrientation();
    const colors = useColors();
    const isHorizontal = orientation === "horizontal";

    return (
        <View
            style={[
                style.wrapper,
                isHorizontal ? style.horizontalWrapper : undefined,
            ]}>
            <View
                style={[
                    style.console,
                    isHorizontal ? style.horizontalConsole : undefined,
                    {
                        backgroundColor: colors.hasCustomBackground
                            ? colors.surfacePrimary
                            : colors.musicBar,
                        borderColor: colors.divider,
                        shadowColor: colors.shadowHeavy ?? colors.shadow ?? "#000",
                    },
                ]}>
                <SeekBar />
                <PlayControl />
            </View>
        </View>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        height: rpx(260),
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        justifyContent: "flex-end",
    },
    horizontalWrapper: {
        height: rpx(166),
        paddingBottom: spacing.sm,
    },
    console: {
        width: "100%",
        minHeight: rpx(220),
        borderRadius: radius.xxxl,
        borderWidth: StyleSheet.hairlineWidth,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        shadowOffset: { width: 0, height: rpx(10) },
        shadowOpacity: 0.18,
        shadowRadius: rpx(14),
        elevation: 10,
    },
    horizontalConsole: {
        minHeight: rpx(148),
        borderRadius: radius.xxl,
        paddingTop: 0,
        paddingBottom: 0,
    },
});
