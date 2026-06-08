import Divider from "@/components/base/divider";
import { IIconName } from "@/components/base/icon.tsx";
import ListItem from "@/components/base/listItem";
import PageBackground from "@/components/base/pageBackground";
import ThemeText from "@/components/base/themeText";
import { showDialog } from "@/components/dialogs/useDialog";
import { showPanel } from "@/components/panels/usePanel";
import { useI18N } from "@/core/i18n";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import TrackPlayer from "@/core/trackPlayer";
import { checkUpdateAndShowResult } from "@/hooks/useCheckUpdate.ts";
import NativeUtils from "@/native/utils";
import rpx from "@/utils/rpx";
import { useScheduleCloseCountDown } from "@/utils/scheduleClose";
import timeformat from "@/utils/timeformat";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import React, { memo } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import {
    default as DeviceInfo,
    default as deviceInfoModule,
} from "react-native-device-info";
import useColors from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";

const ITEM_HEIGHT = rpx(108);

interface ISettingOptions {
    icon: IIconName;
    title: string;
    onPress?: () => void;
}

function HomeDrawer(props: any) {
    const navigate = useNavigate();
    const colors = useColors();
    function navigateToSetting(settingType: string) {
        navigate(ROUTE_PATH.SETTING, {
            type: settingType,
        });
    }

    const { t, getSupportedLanguages, getLanguage, setLanguage } = useI18N();

    const basicSetting: ISettingOptions[] = [
        {
            icon: "cog-8-tooth",
            title: t("sidebar.basicSettings"),
            onPress: () => {
                navigateToSetting("basic");
            },
        },
        {
            icon: "javascript",
            title: t("sidebar.pluginManagement"),
            onPress: () => {
                navigateToSetting("plugin");
            },
        },
        {
            icon: "t-shirt-outline",
            title: t("sidebar.themeSettings"),
            onPress: () => {
                navigateToSetting("theme");
            },
        },
    ];

    const otherSetting: ISettingOptions[] = [
        {
            icon: "circle-stack",
            title: t("sidebar.backupAndResume"),
            onPress: () => {
                navigateToSetting("backup");
            },
        },
    ];

    otherSetting.push({
        icon: "shield-keyhole-outline",
        title: t("sidebar.permissionManagement"),
        onPress: () => {
            navigate(ROUTE_PATH.PERMISSIONS);
        },
    });

    return (
        <>
            <PageBackground />
            <DrawerContentScrollView
                {...[props]}
                style={[
                    style.scrollWrapper,
                    { backgroundColor: colors.pageBackground },
                ]}>
                <View style={style.header}>
                    <ThemeText
                        fontSize="appbar"
                        fontWeight="bold"
                        style={{ color: colors.primary }}>
                        {DeviceInfo.getApplicationName()}
                    </ThemeText>
                </View>

                <View
                    style={[
                        style.card,
                        {
                            backgroundColor: colors.surfaceSecondary,
                            shadowColor: colors.shadow,
                        },
                    ]}>
                    <ListItem
                        withHorizontalPadding
                        heightType="smallest"
                        style={style.cardHeader}>
                        <ThemeText
                            fontSize="subTitle"
                            fontWeight="bold"
                            fontColor="textSecondary">
                            {t("common.setting")}
                        </ThemeText>
                    </ListItem>
                    {basicSetting.map((item, index) => (
                        <ListItem
                            withHorizontalPadding
                            key={"basic-setting-" + index}
                            onPress={item.onPress}
                            style={style.cardItem}>
                            <ListItem.ListItemIcon
                                icon={item.icon}
                                width={rpx(48)}
                                color={colors.primary}
                            />
                            <ListItem.Content title={item.title} />
                        </ListItem>
                    ))}
                </View>

                <View
                    style={[
                        style.card,
                        {
                            backgroundColor: colors.surfaceSecondary,
                            shadowColor: colors.shadow,
                        },
                    ]}>
                    <ListItem
                        withHorizontalPadding
                        heightType="smallest"
                        style={style.cardHeader}>
                        <ThemeText
                            fontSize="subTitle"
                            fontWeight="bold"
                            fontColor="textSecondary">
                            {t("common.other")}
                        </ThemeText>
                    </ListItem>
                    <CountDownItem />
                    {otherSetting.map((item, index) => (
                        <ListItem
                            withHorizontalPadding
                            key={"other-setting-" + index}
                            onPress={item.onPress}
                            style={style.cardItem}>
                            <ListItem.ListItemIcon
                                icon={item.icon}
                                width={rpx(48)}
                                color={colors.primary}
                            />
                            <ListItem.Content title={item.title} />
                        </ListItem>
                    ))}
                    <ListItem
                        withHorizontalPadding
                        key="language"
                        onPress={() => {
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
                        }}
                        style={style.cardItem}>
                        <ListItem.ListItemIcon
                            icon="language"
                            width={rpx(48)}
                            color={colors.primary}
                        />
                        <ListItem.Content
                            title={t("sidebar.languageSettings")}
                        />
                        <ListItem.ListItemText
                            fontSize="subTitle"
                            position="right"
                            fontColor="textSecondary">
                            {getLanguage().name}
                        </ListItem.ListItemText>
                    </ListItem>
                </View>

                <View
                    style={[
                        style.card,
                        {
                            backgroundColor: colors.surfaceSecondary,
                            shadowColor: colors.shadow,
                        },
                    ]}>
                    <ListItem
                        withHorizontalPadding
                        heightType="smallest"
                        style={style.cardHeader}>
                        <ThemeText
                            fontSize="subTitle"
                            fontWeight="bold"
                            fontColor="textSecondary">
                            {t("common.software")}
                        </ThemeText>
                    </ListItem>

                    <ListItem
                        withHorizontalPadding
                        key={"update"}
                        onPress={() => {
                            checkUpdateAndShowResult(true);
                        }}
                        style={style.cardItem}>
                        <ListItem.ListItemIcon
                            icon={"arrow-path"}
                            width={rpx(48)}
                            color={colors.primary}
                        />
                        <ListItem.Content title={t("sidebar.checkUpdate")} />
                        <ListItem.ListItemText
                            position="right"
                            fontSize="subTitle"
                            fontColor="textSecondary">
                            {`${t("sidebar.currentVersion")}${deviceInfoModule.getVersion()}`}
                        </ListItem.ListItemText>
                    </ListItem>
                    <ListItem
                        withHorizontalPadding
                        key={"about"}
                        onPress={() => {
                            navigateToSetting("about");
                        }}
                        style={style.cardItem}>
                        <ListItem.ListItemIcon
                            icon={"information-circle"}
                            width={rpx(48)}
                            color={colors.primary}
                        />
                        <ListItem.Content
                            title={`${t("common.about")} ${deviceInfoModule.getApplicationName()}`}
                        />
                    </ListItem>
                </View>

                <Divider />
                <ListItem
                    withHorizontalPadding
                    onPress={() => {
                        BackHandler.exitApp();
                    }}
                    style={style.cardItem}>
                    <ListItem.ListItemIcon
                        icon={"home-outline"}
                        width={rpx(48)}
                        color={colors.textSecondary}
                    />
                    <ListItem.Content title={t("sidebar.backToDesktop")} />
                </ListItem>
                <ListItem
                    withHorizontalPadding
                    onPress={async () => {
                        await TrackPlayer.reset();
                        NativeUtils.exitApp();
                    }}
                    style={style.cardItem}>
                    <ListItem.ListItemIcon
                        icon={"power-outline"}
                        width={rpx(48)}
                        color={colors.danger}
                    />
                    <ListItem.Content title={t("sidebar.exitApp")} />
                </ListItem>
            </DrawerContentScrollView>
        </>
    );
}

export default memo(HomeDrawer, () => true);

const style = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: "#999999",
    },
    scrollWrapper: {
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    header: {
        height: rpx(120),
        width: "100%",
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.sm,
    },
    card: {
        marginBottom: spacing.lg,
        borderRadius: radius.lg,
        paddingVertical: spacing.sm,
        shadowOffset: { width: 0, height: rpx(4) },
        shadowOpacity: 0.1,
        shadowRadius: rpx(12),
        elevation: 3,
        overflow: "hidden",
    },
    cardHeader: {
        marginBottom: spacing.xs,
        paddingHorizontal: spacing.md,
    },
    cardItem: {
        paddingHorizontal: spacing.md,
    },
    cardContent: {
        paddingHorizontal: 0,
    },
    countDownText: {
        height: ITEM_HEIGHT,
        textAlignVertical: "center",
    },
});

function _CountDownItem() {
    const countDown = useScheduleCloseCountDown();
    const { t } = useI18N();
    const colors = useColors();

    return (
        <ListItem
            withHorizontalPadding
            onPress={() => {
                showPanel("TimingClose");
            }}
            style={style.cardItem}>
            <ListItem.ListItemIcon
                icon="alarm-outline"
                width={rpx(48)}
                color={colors.primary}
            />
            <ListItem.Content title={t("sidebar.scheduleClose")} />
            <ListItem.ListItemText
                position="right"
                fontSize="subTitle"
                fontColor="textSecondary">
                {countDown ? timeformat(countDown) : ""}
            </ListItem.ListItemText>
        </ListItem>
    );
}

const CountDownItem = memo(_CountDownItem, () => true);
