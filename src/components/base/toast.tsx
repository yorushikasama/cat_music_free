import { timingConfig } from "@/constants/commonConst";
import { fontSizeConst } from "@/constants/uiConst";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import { GlobalState } from "@/utils/stateMapper";
import { nanoid } from "nanoid";
import React, { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
    Directions,
    Gesture,
    GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
    cancelAnimation,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import Icon from "@/components/base/icon.tsx";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";

export interface IToastConfig {
    type: "success" | "warn";
    message?: string;
    actionText?: string;
    onActionClick?: () => void;
    duration?: number;
}

type IToastConfigInner = IToastConfig & {
    id: string;
};

const toastQueue: IToastConfigInner[] = [];

const fixedTop = rpx(250);

const activeToastStore = new GlobalState<IToastConfigInner | null>(null);

const typeConfig = {
    success: {
        name: "check-circle",
        colorKey: "success" as const,
    },
    warn: {
        name: "exclamation-circle",
        colorKey: "danger" as const,
    },
} as const;

export function ToastBaseComponent() {
    const activeToast = activeToastStore.useValue();
    const colors = useColors();

    const toastAnim = useSharedValue(0);

    const setNextToast = useCallback(() => {
        activeToastStore.setValue(toastQueue.shift() || null);
    }, []);

    useEffect(() => {
        if (activeToast) {
            toastAnim.value = withTiming(1, timingConfig.animationSlow, () => {
                toastAnim.value = withDelay(
                    activeToast.duration || 1200,
                    withTiming(0, timingConfig.animationSlow, finished => {
                        if (finished) {
                            runOnJS(setNextToast)();
                        }
                    }),
                );
            });
        }
    }, [activeToast]);

    function removeCurrentToast() {
        if (toastAnim.value === 1) {
            cancelAnimation(toastAnim);
            toastAnim.value = withTiming(
                0,
                timingConfig.animationSlow,
                finished => {
                    if (finished) {
                        runOnJS(setNextToast)();
                    }
                },
            );
        }
    }

    const flingGesture = Gesture.Fling()
        .direction(Directions.UP)
        .onEnd(() => {
            removeCurrentToast();
        })
        .runOnJS(true);

    const toastAnimStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateY: (toastAnim.value - 1) * fixedTop,
                },
            ],
            opacity: toastAnim.value,
        };
    });

    return activeToast ? (
        <GestureDetector gesture={flingGesture}>
            <View style={styles.container}>
                <Animated.View
                    style={[
                        styles.contentContainer,
                        {
                            backgroundColor: colors.notification,
                            shadowColor: colors.shadow,
                        },
                        toastAnimStyle,
                    ]}>
                    <Icon
                        size={fontSizeConst.appbar}
                        name={typeConfig[activeToast.type].name}
                        color={colors[typeConfig[activeToast.type].colorKey] ?? typeConfig[activeToast.type].colorKey}
                    />
                    <Text
                        numberOfLines={2}
                        style={[styles.text, { color: colors.text }]}>
                        {activeToast.message}
                    </Text>
                    {activeToast.actionText && activeToast.onActionClick ? (
                        <Pressable
                            style={[
                                styles.actionTextContainer,
                                { backgroundColor: colors.primary },
                            ]}
                            onPress={activeToast.onActionClick}>
                            <Text style={styles.actionText} numberOfLines={1}>
                                {activeToast.actionText}
                            </Text>
                        </Pressable>
                    ) : null}
                </Animated.View>
            </View>
        </GestureDetector>
    ) : null;
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: rpx(128),
        width: "100%",
        alignItems: "center",
        height: rpx(100),
        zIndex: 20000,
    },
    contentContainer: {
        width: rpx(688),
        height: "100%",
        borderRadius: radius.xl,
        backgroundColor: "blue",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,

        elevation: 2,
    },
    text: {
        fontSize: fontSizeConst.content,
        includeFontPadding: false,
        flex: 1,
        marginLeft: spacing.md,
    },
    actionText: {
        fontSize: fontSizeConst.content,
        includeFontPadding: false,
        color: "white",
    },
    actionTextContainer: {
        marginLeft: spacing.md,
        width: rpx(120),
        paddingHorizontal: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.pill,
        height: rpx(58),
    },
});

export function showToast(config: IToastConfig) {
    const id = nanoid();
    const _config = {
        ...config,
        id,
    };
    const activeToast = activeToastStore.getValue();
    if (!activeToast) {
        activeToastStore.setValue(_config);
    } else {
        toastQueue.push(_config);
    }

    return id;
}
