import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import ThemeText from "@/components/base/themeText";

import {
    setCloseAfterPlayEnd,
    setScheduleClose,
    useCloseAfterPlayEnd,
    useScheduleCloseCountDown,
} from "@/utils/scheduleClose";
import timeformat from "@/utils/timeformat";
import PanelBase from "../base/panelBase";
import PanelHeader from "../base/panelHeader";
import Checkbox from "@/components/base/checkbox";
import { useI18N } from "@/core/i18n";
import { showDialog } from "@/components/dialogs/useDialog";
import Icon from "@/components/base/icon";
import useColors from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { iconSizeConst } from "@/constants/uiConst";
import Color from "color";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "@/utils/toast";

const shortCutTimes = [10, 20, 30, 45, 60] as const;

export default function TimingClose() {
    const closeAfterPlay = useCloseAfterPlayEnd();
    const countDown = useScheduleCloseCountDown();

    const isCountingDown = countDown !== null;
    const { t } = useI18N();
    const colors = useColors();
    const safeAreaInsets = useSafeAreaInsets();

    const primarySoft = Color(colors.primary).alpha(0.1).rgb().string();
    const primaryBorder = Color(colors.primary).alpha(0.22).rgb().string();
    const primaryStrong = Color(colors.primary).alpha(0.16).rgb().string();
    const danger = colors.danger ?? "#ff5a6a";
    const dangerSoft = Color(danger).alpha(0.1).rgb().string();
    const dangerBorder = Color(danger).alpha(0.24).rgb().string();

    const selectTime = (minutes: number) => {
        setScheduleClose(Date.now() + minutes * 60000);
        Toast.success(
            t("panel.timingClose.scheduleSet", {
                minutes,
            }),
        );
    };

    const handleCloseAfterPlayChange = () => {
        const nextValue = !closeAfterPlay;
        setCloseAfterPlayEnd(nextValue);
        Toast.success(
            t(
                nextValue
                    ? "panel.timingClose.closeAfterPlayEnabled"
                    : "panel.timingClose.closeAfterPlayDisabled",
            ),
        );
    };

    return (
        <PanelBase
            keyboardAvoidBehavior="none"
            positionMethod="top"
            height={rpx(620) + safeAreaInsets.bottom}
            renderBody={() => (
                <>
                    <PanelHeader
                        hideDivider
                        hideButtons
                        title={t("sidebar.scheduleClose")}
                    />
                    <ScrollView
                        style={styles.body}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.bodyContent,
                            {
                                paddingBottom:
                                    safeAreaInsets.bottom + spacing.xl,
                            },
                        ]}>
                        <View
                            style={[
                                styles.statusCard,
                                {
                                    backgroundColor: isCountingDown
                                        ? primarySoft
                                        : colors.surfaceSecondary,
                                    borderColor: isCountingDown
                                        ? primaryBorder
                                        : colors.divider,
                                },
                            ]}>
                            <View
                                style={[
                                    styles.statusIcon,
                                    { backgroundColor: primaryStrong },
                                ]}>
                                <Icon
                                    name="alarm-outline"
                                    size={iconSizeConst.normal}
                                    color={colors.primary}
                                />
                            </View>
                            <View style={styles.statusText}>
                                <ThemeText
                                    fontSize="description"
                                    fontColor="textSecondary"
                                    numberOfLines={1}>
                                    {isCountingDown
                                        ? t("panel.timingClose.active")
                                        : t("panel.timingClose.inactive")}
                                </ThemeText>
                                <ThemeText
                                    fontSize="appbar"
                                    fontWeight="bold"
                                    numberOfLines={1}
                                    style={styles.countdownText}>
                                    {isCountingDown
                                        ? timeformat(countDown)
                                        : t("panel.timingClose.notSet")}
                                </ThemeText>
                            </View>
                        </View>

                        <ThemeText
                            fontSize="description"
                            fontWeight="medium"
                            fontColor="textSecondary"
                            style={styles.sectionTitle}>
                            {t("panel.timingClose.quickChoices")}
                        </ThemeText>

                        <View style={styles.timeGrid}>
                            {shortCutTimes.map(time => (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`${time} ${t(
                                        "panel.timingClose.minute",
                                    )}`}
                                    android_ripple={{
                                        color: colors.pressedOverlay,
                                    }}
                                    style={({ pressed }) => [
                                        styles.timeItem,
                                        {
                                            backgroundColor:
                                                colors.surfaceSecondary,
                                            borderColor: colors.divider,
                                            opacity: pressed ? 0.76 : 1,
                                        },
                                    ]}
                                    key={time}
                                    onPress={() => selectTime(time)}>
                                    <ThemeText
                                        fontSize="title"
                                        fontWeight="bold">
                                        {time}
                                    </ThemeText>
                                    <ThemeText
                                        fontSize="description"
                                        fontColor="textSecondary"
                                        style={styles.minuteText}>
                                        {t("panel.timingClose.minute")}
                                    </ThemeText>
                                </Pressable>
                            ))}
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t(
                                    "panel.timingClose.customize",
                                )}
                                android_ripple={{
                                    color: colors.pressedOverlay,
                                }}
                                style={({ pressed }) => [
                                    styles.timeItem,
                                    styles.customTimeItem,
                                    {
                                        backgroundColor: primarySoft,
                                        borderColor: primaryBorder,
                                        opacity: pressed ? 0.76 : 1,
                                    },
                                ]}
                                key="customize"
                                onPress={() => {
                                    showDialog("SetScheduleCloseTimeDialog", {
                                        onOk: (minutes: number) => {
                                            selectTime(minutes);
                                        },
                                    });
                                }}>
                                <Icon
                                    name="plus"
                                    size={rpx(30)}
                                    color={colors.primary}
                                />
                                <ThemeText
                                    fontSize="subTitle"
                                    fontWeight="semibold"
                                    color={colors.primary}
                                    style={styles.customText}>
                                    {t("panel.timingClose.customize")}
                                </ThemeText>
                            </Pressable>
                        </View>

                        <Pressable
                            accessibilityRole="checkbox"
                            accessibilityLabel={t(
                                "panel.timingClose.closeAfterPlay",
                            )}
                            accessibilityState={{ checked: closeAfterPlay }}
                            android_ripple={{ color: colors.pressedOverlay }}
                            style={({ pressed }) => [
                                styles.optionRow,
                                {
                                    backgroundColor: colors.surfaceSecondary,
                                    borderColor: colors.divider,
                                    opacity: pressed ? 0.76 : 1,
                                },
                            ]}
                            onPress={() => {
                                handleCloseAfterPlayChange();
                            }}>
                            <View style={styles.optionContent}>
                                <Icon
                                    name="check-circle-outline"
                                    size={iconSizeConst.light}
                                    color={
                                        closeAfterPlay
                                            ? colors.primary
                                            : colors.textSecondary
                                    }
                                />
                                <View style={styles.optionText}>
                                    <ThemeText
                                        fontWeight="semibold"
                                        numberOfLines={1}>
                                        {t("panel.timingClose.closeAfterPlay")}
                                    </ThemeText>
                                    <ThemeText
                                        fontSize="description"
                                        fontColor="textSecondary"
                                        numberOfLines={1}
                                        style={styles.optionDescription}>
                                        {t(
                                            "panel.timingClose.closeAfterPlayDesc",
                                        )}
                                    </ThemeText>
                                </View>
                            </View>
                            <Checkbox checked={closeAfterPlay} />
                        </Pressable>

                        {isCountingDown ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t(
                                    "panel.timingClose.cancelScheduleClose",
                                )}
                                android_ripple={{
                                    color: colors.pressedOverlay,
                                }}
                                style={({ pressed }) => [
                                    styles.cancelButton,
                                    {
                                        backgroundColor: dangerSoft,
                                        borderColor: dangerBorder,
                                        opacity: pressed ? 0.76 : 1,
                                    },
                                ]}
                                onPress={() => {
                                    setScheduleClose(null);
                                    Toast.success(
                                        t(
                                            "panel.timingClose.scheduleCancelled",
                                        ),
                                    );
                                }}>
                                <Icon
                                    name="x-mark"
                                    size={rpx(30)}
                                    color={danger}
                                />
                                <ThemeText
                                    fontWeight="semibold"
                                    color={danger}
                                    style={styles.cancelButtonText}>
                                    {t("panel.timingClose.cancelScheduleClose")}
                                </ThemeText>
                            </Pressable>
                        ) : null}
                    </ScrollView>
                </>
            )}
        />
    );
}

const styles = StyleSheet.create({
    body: {
        flex: 1,
        width: "100%",
    },
    bodyContent: {
        paddingHorizontal: spacing.md,
    },
    statusCard: {
        minHeight: rpx(124),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.xxl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        flexDirection: "row",
        alignItems: "center",
    },
    statusIcon: {
        width: rpx(72),
        height: rpx(72),
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.md,
    },
    statusText: {
        flex: 1,
        minWidth: 0,
    },
    countdownText: {
        marginTop: rpx(8),
    },
    sectionTitle: {
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    timeGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
    },
    timeItem: {
        width: "31.6%",
        height: rpx(112),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.xl,
        alignItems: "center",
        justifyContent: "center",
    },
    minuteText: {
        marginTop: rpx(4),
    },
    customTimeItem: {
        flexDirection: "row",
    },
    customText: {
        marginLeft: rpx(8),
    },
    optionRow: {
        minHeight: rpx(104),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.xl,
        paddingHorizontal: spacing.md,
        marginTop: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    optionContent: {
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        marginRight: spacing.md,
    },
    optionText: {
        flex: 1,
        minWidth: 0,
        marginLeft: spacing.sm,
    },
    optionDescription: {
        marginTop: rpx(6),
    },
    cancelButton: {
        height: rpx(88),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.xl,
        marginTop: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButtonText: {
        marginLeft: rpx(8),
    },
});
