import React, { ReactNode, useEffect, useMemo, useRef } from "react";
import {
    BackHandler,
    NativeEventSubscription,
    StyleProp,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
} from "react-native";
import rpx, { vh, vw } from "@/utils/rpx";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { timingConfig } from "@/constants/commonConst";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import Divider from "@/components/base/divider";
import { fontSizeConst } from "@/constants/uiConst";
import { ScrollView } from "react-native-gesture-handler";
import useOrientation from "@/hooks/useOrientation.ts";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";

const Z_INDEX = {
    backdrop: 16300,
    dialog: 16310,
};

interface IDialogProps {
    onDismiss?: () => void;
    children?: ReactNode;
}

function Dialog(props: IDialogProps) {
    const { children, onDismiss } = props;

    const sharedShowValue = useSharedValue(0);
    const colors = useColors();
    const backHandlerRef = useRef<NativeEventSubscription>();
    const orientation = useOrientation();

    // 对话框宽度
    const dialogContainerStyle: ViewStyle =
        orientation === "vertical"
            ? {
                width: vw(100) - rpx(72),
            }
            : {
                width: "80%",
            };

    useEffect(() => {
        sharedShowValue.value = 1;
        if (backHandlerRef.current) {
            backHandlerRef.current?.remove();
            backHandlerRef.current = undefined;
        }
        backHandlerRef.current = BackHandler.addEventListener(
            "hardwareBackPress",
            () => {
                onDismiss?.();
                return true;
            },
        );

        return () => {
            sharedShowValue.value = 0;
            if (backHandlerRef.current) {
                backHandlerRef.current?.remove();
                backHandlerRef.current = undefined;
            }
        };
    }, []);

    const containerStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(
                sharedShowValue.value,
                timingConfig.animationFast,
            ),
        };
    });

    const scaleAnimationStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: withTiming(
                        0.9 + sharedShowValue.value * 0.1,
                        timingConfig.animationFast,
                    ),
                },
            ],
        };
    });

    return (
        <View style={styles.backContainer}>
            <TouchableWithoutFeedback
                style={styles.container}
                onPress={onDismiss}>
                <Animated.View style={[styles.container, containerStyle]} />
            </TouchableWithoutFeedback>
            <Animated.View
                style={[
                    styles.dialogContainer,
                    dialogContainerStyle,
                    containerStyle,
                    scaleAnimationStyle,
                    {
                        backgroundColor: colors.surfacePrimary ?? colors.backdrop,
                        shadowColor: colors.shadow,
                        borderColor: colors.divider,
                    },
                ]}>
                {children}
            </Animated.View>
        </View>
    );
}

interface IDialogTitleProps {
    children?: ReactNode;
    withDivider?: boolean;
    stringContent?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
}

function Title(props: IDialogTitleProps) {
    const { children, withDivider, stringContent, containerStyle } = props;

    return (
        <>
            <View style={[styles.titleContainer, containerStyle]}>
                {typeof children === "string" || stringContent ? (
                    <ThemeText
                        fontSize="title"
                        fontWeight="bold"
                        numberOfLines={1}>
                        {children}
                    </ThemeText>
                ) : (
                    children
                )}
            </View>
            {withDivider ? <Divider /> : null}
        </>
    );
}

interface IDialogContentProps {
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
    needScroll?: boolean;
}

function Content(props: IDialogContentProps) {
    const { children, style, needScroll } = props;

    const content =
        typeof children === "string" ? (
            <ThemeText fontSize="content" style={styles.defaultFontStyle}>
                {children}
            </ThemeText>
        ) : (
            children
        );

    return (
        <View
            style={[
                styles.contentContainer,
                {
                    maxHeight: vh(50),
                },
                style,
            ]}>
            {needScroll ? <ScrollView>{content}</ScrollView> : content}
        </View>
    );
}

interface IDialogActionsProps {
    children?: ReactNode;
    actions?: Array<{
        title: string;
        type?: "normal" | "primary" | "danger";
        show?: boolean;
        onPress?: () => void;
    }>;
    style?: StyleProp<ViewStyle>;
}

function Actions(props: IDialogActionsProps) {
    const { children, style, actions } = props;

    const validActions = useMemo(
        () => actions?.filter(it => it.show !== false),
        [actions],
    );

    const _children = validActions?.length ? (
        <>
            {validActions.map((it, index) =>
                it.show === false ? null : (
                    <BottomButton
                        key={index}
                        style={index === 0 ? null : styles.actionButton}
                        onPress={it.onPress}
                        text={it.title}
                        type={it.type}
                    />
                ),
            )}
        </>
    ) : (
        children
    );

    return (
        <View style={[styles.actionsContainer, style]}>
            {typeof children === "string" ? (
                <ThemeText fontSize="content" numberOfLines={1}>
                    {children}
                </ThemeText>
            ) : (
                _children
            )}
        </View>
    );
}

function BottomButton(props: {
    type?: "normal" | "primary" | "danger";
    text: string;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
}) {
    const { type = "normal", text, style, onPress } = props;
    const colors = useColors();

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            onPress={onPress}
            style={[
                styles.bottomBtn,
                {
                    backgroundColor: type === "primary"
                        ? colors.primary
                        : type === "danger"
                            ? colors.danger ?? "#FC5F5F"
                            : colors.surfaceSecondary,
                },
                style,
            ]}>
            <ThemeText
                fontWeight="medium"
                numberOfLines={1}
                color={type === "normal" ? undefined : "white"}>
                {text}
            </ThemeText>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    bottomBtn: {
        borderRadius: radius.pill,
        flex: 1,
        flexShrink: 0,
        minWidth: rpx(120),
        justifyContent: "center",
        alignItems: "center",
        height: rpx(64),
    },
    backContainer: {
        position: "absolute",
        zIndex: Z_INDEX.backdrop - 1,
        width: "100%",
        height: "100%",
        left: 0,
        top: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    container: {
        zIndex: Z_INDEX.backdrop,
        position: "absolute",
        width: "100%",
        height: "100%",
        left: 0,
        top: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    dialogContainer: {
        position: "absolute",
        width: "80%",
        zIndex: Z_INDEX.dialog,
        borderRadius: radius.xl,
        borderWidth: StyleSheet.hairlineWidth,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,

        elevation: 5,
        overflow: "hidden",
    },

    defaultFontStyle: {
        lineHeight: fontSizeConst.content * 1.5,
    },

    titleContainer: {
        minHeight: rpx(96),
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        paddingHorizontal: spacing.lg,
    },
    contentContainer: {
        width: "100%",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
    },
    actionsContainer: {
        width: "100%",
        minHeight: rpx(92),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        flexWrap: "nowrap",
    },
    actionButton: {
        marginLeft: spacing.md,
    },
});

Dialog.Title = Title;
Dialog.Content = Content;
Dialog.Actions = Actions;

export default Dialog;
