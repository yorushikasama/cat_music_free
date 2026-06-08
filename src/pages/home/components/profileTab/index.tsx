import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import globalStyle from "@/constants/globalStyle";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { useI18N } from "@/core/i18n";
import Color from "color";
import { useNavigate } from "@/core/router";
import { ROUTE_PATH } from "@/core/router/index.ts";
import { showDialog } from "@/components/dialogs/useDialog";
import { showPanel } from "@/components/panels/usePanel";
import Icon from "@/components/base/icon.tsx";
import { TouchableOpacity } from "react-native-gesture-handler";
import { checkUpdateAndShowResult } from "@/hooks/useCheckUpdate.ts";
import deviceInfoModule from "react-native-device-info";
import { useScheduleCloseCountDown } from "@/utils/scheduleClose";
import timeformat from "@/utils/timeformat";

interface IProfileItem {
    icon: string;
    title: string;
    onPress?: () => void;
    rightText?: string;
}

export default function ProfileTab() {
    const colors = useColors();
    const { t, getSupportedLanguages, getLanguage, setLanguage } = useI18N();
    const navigate = useNavigate();
    const countDown = useScheduleCloseCountDown();

    function navigateToSetting(settingType: string) {
        navigate(ROUTE_PATH.SETTING, {
            type: settingType,
        });
    }

    const settingItems: IProfileItem[] = [
        {
            icon: "cog-8-tooth",
            title: t("sidebar.basicSettings"),
            onPress: () => navigateToSetting("basic"),
        },
        {
            icon: "javascript",
            title: t("sidebar.pluginManagement"),
            onPress: () => navigateToSetting("plugin"),
        },
        {
            icon: "t-shirt-outline",
            title: t("sidebar.themeSettings"),
            onPress: () => navigateToSetting("theme"),
        },
    ];

    const otherItems: IProfileItem[] = [
        {
            icon: "alarm-outline",
            title: t("sidebar.scheduleClose"),
            onPress: () => showPanel("TimingClose"),
            rightText: countDown ? timeformat(countDown) : "",
        },
        {
            icon: "circle-stack",
            title: t("sidebar.backupAndResume"),
            onPress: () => navigateToSetting("backup"),
        },
        {
            icon: "shield-keyhole-outline",
            title: t("sidebar.permissionManagement"),
            onPress: () => navigate(ROUTE_PATH.PERMISSIONS),
        },
        {
            icon: "language",
            title: t("sidebar.languageSettings"),
            onPress: () => {
                showDialog("RadioDialog", {
                    content: getSupportedLanguages().map(item => ({
                        title: item.name,
                        value: item.locale,
                        label: item.name,
                    })),
                    title: t("sidebar.languageSettings"),
                    onOk(value) {
                        setLanguage(value as string);
                    },
                    defaultSelected: getLanguage().locale,
                });
            },
            rightText: getLanguage().name,
        },
    ];

    const softwareItems: IProfileItem[] = [
        {
            icon: "arrow-path",
            title: t("sidebar.checkUpdate"),
            onPress: () => checkUpdateAndShowResult(true),
            rightText: `${t("sidebar.currentVersion")}${deviceInfoModule.getVersion()}`,
        },
        {
            icon: "information-circle",
            title: `${t("common.about")} ${deviceInfoModule.getApplicationName()}`,
            onPress: () => navigateToSetting("about"),
        },
    ];

    const renderSection = (
        items: IProfileItem[],
    ) => (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: colors.surfacePrimary,
                },
            ]}>
            {items.map((item, index) => {
                const isFirst = index === 0;
                return (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.item,
                            !isFirst && {
                                borderTopWidth: StyleSheet.hairlineWidth,
                                borderTopColor: colors.divider,
                            },
                        ]}
                        onPress={item.onPress}
                        activeOpacity={0.6}>
                        <View style={[styles.iconContainer, { backgroundColor: Color(colors.primary).alpha(0.09).rgb().string() }]}>
                            <Icon
                                name={item.icon as any}
                                size={rpx(32)}
                                color={colors.primary}
                            />
                        </View>
                        <ThemeText
                            fontSize="content"
                            style={styles.itemTitle}>
                            {item.title}
                        </ThemeText>
                        {item.rightText ? (
                            <ThemeText
                                fontSize="subTitle"
                                fontColor="textSecondary"
                                style={styles.rightText}>
                                {item.rightText}
                            </ThemeText>
                        ) : null}
                        <Icon
                            name="chevron-right"
                            size={rpx(28)}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    return (
        <ScrollView
            style={[globalStyle.fwflex1, { backgroundColor: colors.pageBackground }]}
            showsVerticalScrollIndicator={false}>
            <View style={[
                styles.header,
                {
                    backgroundColor: colors.surfacePrimary,
                },
            ]}>
                <View style={styles.headerContent}>
                    <View style={[styles.avatarContainer, { backgroundColor: Color(colors.primary).alpha(0.13).rgb().string() }]}>
                        <Icon
                            name="user"
                            size={rpx(56)}
                            color={colors.primary}
                        />
                    </View>
                    <View style={styles.headerText}>
                        <ThemeText
                            fontSize="title"
                            fontWeight="bold"
                            style={{ color: colors.text }}>
                            {deviceInfoModule.getApplicationName()}
                        </ThemeText>
                        <ThemeText
                            fontSize="subTitle"
                            fontColor="textSecondary">
                            {t("sidebar.currentVersion")}{deviceInfoModule.getVersion()}
                        </ThemeText>
                    </View>
                </View>
            </View>

            <View style={styles.sectionSpacing}>
                {renderSection(settingItems)}
            </View>
            <View style={styles.sectionSpacing}>
                {renderSection(otherItems)}
            </View>
            <View style={styles.sectionSpacing}>
                {renderSection(softwareItems)}
            </View>
            <View style={styles.bottomSpacing} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    header: {
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: radius.lg,
        overflow: "hidden",
        height: rpx(160),
        justifyContent: "center",
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
    },
    avatarContainer: {
        width: rpx(88),
        height: rpx(88),
        borderRadius: radius.pill,
        justifyContent: "center",
        alignItems: "center",
    },
    headerText: {
        marginLeft: spacing.lg,
        justifyContent: "center",
    },
    sectionSpacing: {
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    card: {
        borderRadius: radius.lg,
        overflow: "hidden",
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    iconContainer: {
        width: rpx(64),
        height: rpx(64),
        borderRadius: radius.md,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    itemTitle: {
        flex: 1,
    },
    rightText: {
        marginRight: spacing.sm,
    },
    bottomSpacing: {
        height: spacing.xxxl,
    },
});
