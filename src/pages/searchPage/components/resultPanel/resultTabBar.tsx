import ThemeText from "@/components/base/themeText";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import React, { useCallback, useEffect, useRef } from "react";
import {
    LayoutChangeEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

interface IResultTabRoute {
    key: string;
}

interface IResultTabBarProps<T extends IResultTabRoute> {
    navigationState: {
        index: number;
        routes: T[];
    };
    jumpTo: (key: string) => void;
    getLabel: (route: T) => string;
    compact?: boolean;
}

export default function ResultTabBar<T extends IResultTabRoute>({
    navigationState,
    jumpTo,
    getLabel,
    compact = false,
}: IResultTabBarProps<T>) {
    const colors = useColors();
    const scrollRef = useRef<ScrollView>(null);
    const viewportWidthRef = useRef(0);
    const tabLayoutsRef = useRef<Record<number, { x: number; width: number }>>(
        {},
    );

    const scrollToSelected = useCallback((index: number, animated = true) => {
        const layout = tabLayoutsRef.current[index];
        if (!layout || !viewportWidthRef.current) {
            return;
        }
        const x = Math.max(
            0,
            layout.x + layout.width / 2 - viewportWidthRef.current / 2,
        );
        scrollRef.current?.scrollTo({ x, animated });
    }, []);

    useEffect(() => {
        requestAnimationFrame(() => {
            scrollToSelected(navigationState.index);
        });
    }, [navigationState.index, scrollToSelected]);

    const onViewportLayout = useCallback(
        (event: LayoutChangeEvent) => {
            viewportWidthRef.current = event.nativeEvent.layout.width;
            scrollToSelected(navigationState.index, false);
        },
        [navigationState.index, scrollToSelected],
    );

    return (
        <View style={[styles.wrapper, compact && styles.compactWrapper]}>
            <ScrollView
                ref={scrollRef}
                horizontal
                onLayout={onViewportLayout}
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                    styles.content,
                    compact && styles.compactContent,
                ]}>
                {navigationState.routes.map((route, routeIndex) => {
                    const focused = routeIndex === navigationState.index;

                    return (
                        <Pressable
                            key={route.key}
                            accessibilityRole="tab"
                            accessibilityLabel={getLabel(route)}
                            accessibilityState={{ selected: focused }}
                            onLayout={event => {
                                const { x, width } = event.nativeEvent.layout;
                                tabLayoutsRef.current[routeIndex] = { x, width };
                                if (focused) {
                                    scrollToSelected(routeIndex, false);
                                }
                            }}
                            onPress={() => jumpTo(route.key)}
                            style={({ pressed }) => [
                                styles.tab,
                                compact && styles.compactTab,
                                {
                                    backgroundColor: focused
                                        ? colors.selectedBackground
                                        : colors.controlBackground,
                                    borderColor: focused
                                        ? colors.selectedBorder
                                        : colors.controlBorder ??
                                          colors.divider,
                                },
                                pressed && styles.pressed,
                            ]}>
                            <ThemeText
                                numberOfLines={1}
                                fontSize={compact ? "description" : undefined}
                                fontWeight={focused ? "bold" : "medium"}
                                color={
                                    focused
                                        ? colors.primary
                                        : colors.textSecondary
                                }
                                style={styles.label}>
                                {getLabel(route)}
                            </ThemeText>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        minHeight: rpx(64),
    },
    compactWrapper: {
        minHeight: rpx(58),
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        alignItems: "center",
    },
    compactContent: {
        paddingTop: 0,
    },
    tab: {
        minWidth: rpx(104),
        height: rpx(44),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        marginRight: spacing.xs,
        alignItems: "center",
        justifyContent: "center",
    },
    compactTab: {
        maxWidth: rpx(260),
        height: rpx(42),
        paddingHorizontal: spacing.sm,
    },
    pressed: {
        opacity: 0.72,
    },
    label: {
        textAlign: "center",
    },
});
