import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    StyleProp,
    StyleSheet,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import rpx from "@/utils/rpx";
import ThemeText from "@/components/base/themeText";
import Divider from "@/components/base/divider";
import i18n from "@/core/i18n";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import useColors from "@/hooks/useColors";
import Toast from "@/utils/toast";

interface IPanelHeaderProps {
    title: string;
    cancelText?: string;
    okText?: string;
    onCancel?: () => void | Promise<void>;
    onOk?: () => void | Promise<void>;
    hideButtons?: boolean;
    hideDivider?: boolean;
    style?: StyleProp<ViewStyle>;
}
export default function PanelHeader(props: IPanelHeaderProps) {
    const {
        title,
        cancelText,
        okText,
        onOk,
        onCancel,
        hideButtons,
        hideDivider,
        style,
    } = props;
    const colors = useColors();
    const [confirming, setConfirming] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const handleConfirm = useCallback(async () => {
        if (!onOk || confirming) {
            return;
        }

        setConfirming(true);
        try {
            await onOk();
        } catch (error: any) {
            Toast.warn(
                error?.message ??
                    i18n.t("toast.unknownError", {
                        reason: "",
                    }),
            );
        } finally {
            setConfirming(false);
        }
    }, [confirming, onOk]);

    const handleCancel = useCallback(async () => {
        if (!onCancel || cancelling || confirming) {
            return;
        }

        setCancelling(true);
        try {
            await onCancel();
        } finally {
            setCancelling(false);
        }
    }, [cancelling, confirming, onCancel]);

    return (
        <>
            <View style={[styles.header, style]}>
                {hideButtons ? null : (
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={
                            cancelText || i18n.t("common.cancel")
                        }
                        activeOpacity={0.68}
                        accessibilityState={{
                            busy: cancelling,
                            disabled: !onCancel,
                        }}
                        disabled={!onCancel || confirming || cancelling}
                        style={[
                            styles.button,
                            (confirming || cancelling) && styles.disabled,
                        ]}
                        onPress={handleCancel}>
                        {cancelling ? (
                            <ActivityIndicator
                                color={colors.text}
                                size="small"
                            />
                        ) : (
                            <ThemeText fontWeight="medium">
                                {cancelText || i18n.t("common.cancel")}
                            </ThemeText>
                        )}
                    </TouchableOpacity>
                )}
                <ThemeText
                    style={styles.title}
                    fontWeight="bold"
                    fontSize="title"
                    numberOfLines={1}>
                    {title}
                </ThemeText>
                {hideButtons ? null : (
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={okText || i18n.t("common.confirm")}
                        accessibilityState={{
                            busy: confirming,
                            disabled: !onOk,
                        }}
                        activeOpacity={0.68}
                        disabled={!onOk || confirming}
                        style={[
                            styles.button,
                            styles.rightButton,
                            confirming && styles.disabled,
                        ]}
                        onPress={handleConfirm}>
                        {confirming ? (
                            <ActivityIndicator
                                color={colors.primary}
                                size="small"
                            />
                        ) : (
                            <ThemeText fontWeight="medium" fontColor="primary">
                                {okText || i18n.t("common.confirm")}
                            </ThemeText>
                        )}
                    </TouchableOpacity>
                )}
            </View>
            {hideDivider ? null : <Divider />}
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingTop: rpx(16),
        height: rpx(112),
    },
    button: {
        minWidth: rpx(112),
        height: rpx(56),
        justifyContent: "center",
        borderRadius: radius.pill,
    },
    rightButton: {
        alignItems: "flex-end",
    },
    disabled: {
        opacity: 0.56,
    },
    title: {
        flex: 1,
        textAlign: "center",
    },
});
