import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import AppBar from "@/components/base/appBar";
import Empty from "@/components/base/empty";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import SortableFlatList from "@/components/base/SortableFlatList";
import ThemeText from "@/components/base/themeText";
import globalStyle from "@/constants/globalStyle";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import { useI18N } from "@/core/i18n";
import PluginManager, { Plugin, useSortedPlugins } from "@/core/pluginManager";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import Toast from "@/utils/toast";

const ITEM_HEIGHT = rpx(112);

export default function PluginSort() {
    const plugins = useSortedPlugins();
    const [sortingPlugins, setSortingPlugins] = useState([...plugins]);
    const colors = useColors();
    const { t } = useI18N();

    useEffect(() => {
        setSortingPlugins([...plugins]);
    }, [plugins]);

    const hasChanges = useMemo(() => {
        if (sortingPlugins.length !== plugins.length) {
            return true;
        }
        return sortingPlugins.some(
            (plugin, index) => plugin.hash !== plugins[index]?.hash,
        );
    }, [plugins, sortingPlugins]);

    const saveOrder = useCallback(() => {
        PluginManager.setPluginOrder(sortingPlugins);
        Toast.success(t("toast.saveSuccess"));
    }, [sortingPlugins, t]);

    const resetOrder = useCallback(() => {
        setSortingPlugins([...plugins]);
    }, [plugins]);

    const renderSortingItem = useCallback(
        ({ item, index }: { item: Plugin; index: number }) => (
            <View
                style={[
                    styles.item,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.controlBorder ?? colors.divider,
                    },
                ]}>
                <View
                    style={[
                        styles.indexBadge,
                        {
                            backgroundColor: colors.selectedBackground,
                            borderColor: colors.selectedBorder,
                        },
                    ]}>
                    <ThemeText
                        fontSize="description"
                        fontWeight="bold"
                        fontColor="primary">
                        {index + 1}
                    </ThemeText>
                </View>

                <View style={styles.itemMain}>
                    <ThemeText
                        numberOfLines={1}
                        fontSize="title"
                        fontWeight="medium">
                        {item.name}
                    </ThemeText>
                    <ThemeText
                        numberOfLines={1}
                        fontSize="description"
                        fontColor="textSecondary"
                        style={styles.itemDesc}>
                        {item.instance.author ||
                            item.instance.version ||
                            t("pluginSetting.menu.sort")}
                    </ThemeText>
                </View>
            </View>
        ),
        [colors, t],
    );

    return (
        <>
            <AppBar
                actionComponent={
                    <TouchableOpacity
                        activeOpacity={0.72}
                        accessibilityRole="button"
                        accessibilityLabel={t("common.done")}
                        accessibilityState={{ disabled: !hasChanges }}
                        disabled={!hasChanges}
                        style={[
                            styles.doneNavButton,
                            {
                                backgroundColor: hasChanges
                                    ? colors.selectedBackground
                                    : colors.controlBackground,
                                borderColor: hasChanges
                                    ? colors.selectedBorder
                                    : colors.controlBorder ?? colors.divider,
                            },
                            !hasChanges && styles.disabledAction,
                        ]}
                        onPress={saveOrder}>
                        <ThemeText
                            fontSize="subTitle"
                            fontWeight="semibold"
                            color={
                                hasChanges
                                    ? colors.primary
                                    : colors.textSecondary
                            }>
                            {t("common.done")}
                        </ThemeText>
                    </TouchableOpacity>
                }>
                {t("pluginSetting.menu.sort")}
            </AppBar>
            <HorizontalSafeAreaView style={globalStyle.flex1}>
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <ThemeText
                            fontSize="description"
                            fontColor="textSecondary"
                            lineHeight
                            style={styles.headerDesc}>
                            按住右侧手柄上下拖动，松手后点击完成保存。
                        </ThemeText>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <ThemeText fontSize="description" fontColor="textSecondary">
                        {sortingPlugins.length} 个插件
                    </ThemeText>
                    <TouchableOpacity
                        activeOpacity={0.72}
                        accessibilityRole="button"
                        accessibilityLabel="重置顺序"
                        hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                        onPress={resetOrder}>
                        <ThemeText
                            fontSize="description"
                            fontWeight="medium"
                            fontColor="primary">
                            重置顺序
                        </ThemeText>
                    </TouchableOpacity>
                </View>

                <View style={styles.listWrapper}>
                    {sortingPlugins.length ? (
                        <SortableFlatList
                            data={sortingPlugins}
                            renderItem={renderSortingItem}
                            itemHeight={ITEM_HEIGHT}
                            itemJustifyContent="center"
                            activeBackgroundColor={
                                colors.selectedBackground ?? colors.placeholder
                            }
                            onSortEnd={setSortingPlugins}
                        />
                    ) : (
                        <Empty
                            icon="code-bracket-square"
                            title="暂无插件"
                            description="安装插件后可以在这里调整搜索和内容来源优先级。"
                        />
                    )}
                </View>
            </HorizontalSafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    doneNavButton: {
        minWidth: rpx(92),
        height: rpx(52),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    disabledAction: {
        opacity: 0.54,
    },
    header: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    headerText: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.lg,
    },
    headerDesc: {
        textAlign: "center",
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.md,
    },
    listWrapper: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xxl,
    },
    item: {
        width: "100%",
        height: ITEM_HEIGHT - spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingLeft: spacing.md,
        paddingRight: rpx(112),
        marginBottom: spacing.sm,
    },
    indexBadge: {
        width: rpx(48),
        height: rpx(48),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.md,
    },
    itemMain: {
        flex: 1,
        justifyContent: "center",
    },
    itemDesc: {
        marginTop: rpx(4),
    },
});
