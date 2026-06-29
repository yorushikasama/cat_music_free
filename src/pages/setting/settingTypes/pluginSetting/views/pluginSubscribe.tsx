import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import rpx from "@/utils/rpx";
import Config, { useAppConfig } from "@/core/appConfig";
import { FlatList } from "react-native-gesture-handler";
import Empty from "@/components/base/empty";
import ListItem from "@/components/base/listItem";
import Toast from "@/utils/toast";
import Clipboard from "@react-native-clipboard/clipboard";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import globalStyle from "@/constants/globalStyle";
import { showDialog } from "@/components/dialogs/useDialog";
import AppBar from "@/components/base/appBar";
import Fab from "@/components/base/fab";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";

interface ISubscribeItem {
    name: string;
    url: string;
}

const ITEM_HEIGHT = rpx(108);

export default function PluginSubscribe() {
    const urls = useAppConfig("plugin.subscribeUrl") ?? "";
    const [subscribes, setSubscribes] = useState<Array<ISubscribeItem>>([]);

    const { t } = useI18N();
    const colors = useColors();

    useEffect(() => {
        try {
            const parsed = JSON.parse(urls);
            if (Array.isArray(parsed)) {
                setSubscribes(parsed);
            } else {
                throw new Error();
            }
        } catch {
            if (urls.length) {
                setSubscribes([
                    {
                        name: t("common.default"),
                        url: urls,
                    },
                ]);
            } else {
                setSubscribes([]);
            }
        }
    }, [urls]);

    const onSubmit = (
        subscribeItem: ISubscribeItem,
        hideDialog: () => void,
        editingIndex?: number,
    ) => {
        if (
            subscribeItem.url.endsWith(".js") ||
            subscribeItem.url.endsWith(".json")
        ) {
            if (editingIndex !== undefined) {
                Config.setConfig(
                    "plugin.subscribeUrl",
                    JSON.stringify([
                        ...subscribes.slice(0, editingIndex),
                        subscribeItem,
                        ...subscribes.slice(editingIndex + 1),
                    ]),
                );
            } else {
                Config.setConfig(
                    "plugin.subscribeUrl",
                    JSON.stringify([...subscribes, subscribeItem]),
                );
            }
            hideDialog();
        } else {
            Toast.warn(t("toast.subscriptionHaveToEndWithJs"));
        }
    };

    return (
        <>
            <AppBar>{t("pluginSetting.menu.subscriptionSetting")}</AppBar>
            <HorizontalSafeAreaView style={globalStyle.flex1}>
                <FlatList
                    style={style.listWrapper}
                    contentContainerStyle={style.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Empty
                            icon="bookmark-square"
                            title={t("common.emptyList")}
                            description={t("common.emptyListDescription")}
                            minHeight={rpx(520)}
                        />
                    }
                    data={subscribes}
                    renderItem={({ item, index }) => {
                        return (
                            <ListItem
                                withHorizontalPadding
                                style={[
                                    style.subscribeItem,
                                    {
                                        backgroundColor: colors.surfacePrimary,
                                        borderColor: colors.divider,
                                    },
                                ]}
                                onPress={() => {
                                    showDialog("SubscribePluginDialog", {
                                        subscribeItem: item,
                                        onSubmit,
                                        editingIndex: index,
                                        onDelete(editingIndex, hideDialog) {
                                            Config.setConfig(
                                                "plugin.subscribeUrl",
                                                JSON.stringify([
                                                    ...subscribes.slice(
                                                        0,
                                                        editingIndex,
                                                    ),
                                                    ...subscribes.slice(
                                                        editingIndex + 1,
                                                    ),
                                                ]),
                                            );
                                            hideDialog();
                                            Toast.success(t("toast.deleteSuccess"));
                                        },
                                    });
                                }}>
                                <ListItem.Content
                                    title={item.name}
                                    description={item.url}
                                />
                                <ListItem.ListItemIcon
                                    icon="share"
                                    position="right"
                                    onPress={() => {
                                        Clipboard.setString(item.url);
                                        Toast.success(t("toast.copiedToClipboard"));
                                    }}
                                />
                            </ListItem>
                        );
                    }}
                    getItemLayout={(_, index) => ({
                        length: ITEM_HEIGHT,
                        offset: ITEM_HEIGHT * index,
                        index,
                    })}
                />
            </HorizontalSafeAreaView>
            <Fab
                icon="plus"
                onPress={() => {
                    showDialog("SubscribePluginDialog", {
                        onSubmit,
                    });
                }}
            />
        </>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: rpx(750),
        flex: 1,
    },
    listWrapper: {
        flex: 1,
    },
    listContent: {
        paddingTop: spacing.md,
        paddingBottom: rpx(180),
    },
    subscribeItem: {
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    fab: {
        position: "absolute",
        right: rpx(36),
        bottom: rpx(36),
    },
});
