import React, { memo, useEffect } from "react";
import {
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import Color from "color";

import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";

interface ISkeletonBlockProps {
    width?: number | `${number}%`;
    height?: number;
    radius?: number;
    style?: StyleProp<ViewStyle>;
}

export function SkeletonBlock(props: ISkeletonBlockProps) {
    const colors = useColors();
    const opacity = useSharedValue(0.58);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(1, { duration: 900 }),
            -1,
            true,
        );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const baseColor = colors.surfaceTertiary ?? colors.placeholder;
    const backgroundColor = Color(baseColor).alpha(0.72).rgb().string();

    return (
        <Animated.View
            style={[
                styles.block,
                {
                    width: props.width ?? "100%",
                    height: props.height ?? rpx(24),
                    borderRadius: props.radius ?? radius.sm,
                    backgroundColor,
                },
                animatedStyle,
                props.style,
            ]}
        />
    );
}

interface ISkeletonListProps {
    count?: number;
    withArtwork?: boolean;
    style?: StyleProp<ViewStyle>;
}

function SkeletonList(props: ISkeletonListProps) {
    const { count = 6, withArtwork = true, style } = props;

    return (
        <View style={[styles.list, style]}>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={styles.row}>
                    {withArtwork ? (
                        <SkeletonBlock
                            width={rpx(88)}
                            height={rpx(88)}
                            radius={radius.md}
                            style={styles.artwork}
                        />
                    ) : null}
                    <View style={styles.rowContent}>
                        <SkeletonBlock width="68%" height={rpx(24)} />
                        <SkeletonBlock
                            width="46%"
                            height={rpx(20)}
                            style={styles.line}
                        />
                    </View>
                </View>
            ))}
        </View>
    );
}

export default memo(SkeletonList);

interface ISkeletonGridProps {
    count?: number;
    columns?: number;
    style?: StyleProp<ViewStyle>;
}

export function SkeletonGrid(props: ISkeletonGridProps) {
    const { count = 9, columns = 3, style } = props;

    return (
        <View style={[styles.grid, style]}>
            {Array.from({ length: count }).map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.gridItem,
                        {
                            width: `${100 / columns}%`,
                        },
                    ]}>
                    <SkeletonBlock
                        height={rpx(206)}
                        radius={radius.md}
                    />
                    <SkeletonBlock
                        width="86%"
                        height={rpx(20)}
                        style={styles.gridTitle}
                    />
                    <SkeletonBlock
                        width="58%"
                        height={rpx(18)}
                        style={styles.gridMeta}
                    />
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    block: {
        overflow: "hidden",
    },
    list: {
        width: "100%",
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    row: {
        minHeight: rpx(120),
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
    },
    artwork: {
        marginRight: spacing.md,
    },
    rowContent: {
        flex: 1,
    },
    line: {
        marginTop: spacing.sm,
    },
    grid: {
        width: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.md,
    },
    gridItem: {
        paddingHorizontal: spacing.xs,
        paddingBottom: spacing.lg,
    },
    gridTitle: {
        marginTop: spacing.sm,
    },
    gridMeta: {
        marginTop: spacing.xs,
    },
});
