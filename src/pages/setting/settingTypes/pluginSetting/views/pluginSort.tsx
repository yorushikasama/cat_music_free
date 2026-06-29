import AppBar from "@/components/base/appBar";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import SortableFlatList from "@/components/base/SortableFlatList";
import ThemeText from "@/components/base/themeText";
import globalStyle from "@/constants/globalStyle";
import { useI18N } from "@/core/i18n";
import PluginManager, { Plugin, useSortedPlugins } from "@/core/pluginManager";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import Toast from "@/utils/toast";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import Color from "color";
import React, { useState } from "react";
import { StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "@/components/base/icon";

const ITEM_HEIGHT = rpx(96);
const marginTop = rpx(188) + (StatusBar.currentHeight ?? 0);

export default function PluginSort() {
    const plugins = useSortedPlugins();
    const [sortingPlugins, setSortingPlugins] = useState([...plugins]);

    const colors = useColors();
    const { t } = useI18N();

    function renderSortingItem({ item }: { item: Plugin }) {
        return (
            <View
                style={[
                    style.sortItem,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.divider,
                    },
                ]}>
                <ThemeText numberOfLines={1} style={style.sortItemTitle}>
                    {item.name}
                </ThemeText>
                <Icon name="bars-3" size={rpx(34)} color={colors.textSecondary} />
            </View>
        );
    }
    return (
        <>
            <AppBar>{t("pluginSetting.menu.sort")}</AppBar>
            <HorizontalSafeAreaView
                style={[
                    style.sortWrapper,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.divider,
                    },
                ]}>
                <>
                    <ThemeText fontWeight="bold">{t("pluginSetting.menu.sort")}</ThemeText>
                    <TouchableOpacity
                        style={[
                            style.doneButton,
                            {
                                backgroundColor: Color(colors.primary).alpha(0.12).rgb().string(),
                            },
                        ]}
                        onPress={async () => {
                            PluginManager.setPluginOrder(sortingPlugins);
                            Toast.success(t("toast.saveSuccess"));
                        }}>
                        <ThemeText fontWeight="medium" fontColor="primary">
                            {t("common.done")}
                        </ThemeText>
                    </TouchableOpacity>
                </>
            </HorizontalSafeAreaView>
            <HorizontalSafeAreaView style={globalStyle.flex1}>
                <SortableFlatList
                    data={sortingPlugins}
                    activeBackgroundColor={colors.placeholder}
                    marginTop={marginTop}
                    renderItem={renderSortingItem}
                    itemHeight={ITEM_HEIGHT}
                    itemJustifyContent={"space-between"}
                    onSortEnd={data => {
                        setSortingPlugins(data);
                    }}
                />
            </HorizontalSafeAreaView>
        </>
    );
}

const style = StyleSheet.create({
    sortWrapper: {
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
        justifyContent: "space-between",
        height: rpx(80),
        alignItems: "center",
        flexDirection: "row",
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
    },
    doneButton: {
        minWidth: rpx(104),
        height: rpx(52),
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.md,
    },
    sortItem: {
        height: ITEM_HEIGHT,
        width: rpx(620),
        paddingHorizontal: spacing.lg,
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: "row",
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: spacing.sm,
    },
    sortItemTitle: {
        flex: 1,
        marginRight: spacing.md,
    },
});
