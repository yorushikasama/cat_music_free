import Empty from "@/components/base/empty";
import IconButton from "@/components/base/iconButton";
import ListItem from "@/components/base/listItem";
import ThemeText from "@/components/base/themeText";
import { showDialog } from "@/components/dialogs/useDialog";
import { showPanel } from "@/components/panels/usePanel";
import { ImgAsset } from "@/constants/assetsConst";
import { localPluginPlatform } from "@/constants/commonConst";
import { useI18N } from "@/core/i18n";
import MusicSheet, { useSheetsBase, useStarredSheets } from "@/core/musicSheet";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import useColors from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import Toast from "@/utils/toast";
import rpx from "@/utils/rpx";
import { FlashList } from "@shopify/flash-list";
import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";

export default function Sheets() {
    const [index, setIndex] = useState(0);
    const colors = useColors();
    const navigate = useNavigate();

    const allSheets = useSheetsBase();
    const staredSheets = useStarredSheets();
    const { t } = useI18N();

    return (
        <>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <ThemeText
                        fontSize="appbar"
                        fontWeight="bolder"
                        style={styles.pageTitle}>
                        {t("home.myPlaylists")}
                    </ThemeText>
                    <IconButton
                        name="plus"
                        sizeType="normal"
                        accessibilityLabel={t("home.newPlaylist.a11y")}
                        onPress={() => {
                            showPanel("CreateMusicSheet");
                        }}
                    />
                </View>
                <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceTertiary }]}>
                    <TouchableOpacity
                        accessible
                        accessibilityLabel={t("home.myPlaylistsCount.a11y", {
                            count: allSheets.length,
                        })}
                        style={[
                            styles.segmentButton,
                            index === 0 && {
                                backgroundColor: colors.surfaceSecondary,
                            },
                        ]}
                        onPress={() => {
                            setIndex(0);
                        }}>
                        <ThemeText
                            accessible={false}
                            fontSize="subTitle"
                            fontWeight={index === 0 ? "semibold" : "regular"}
                            fontColor={index === 0 ? "text" : "textSecondary"}>
                            {t("home.myPlaylists")}
                        </ThemeText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        accessible
                        accessibilityLabel={t(
                            "home.starredPlaylistsCount.a11y",
                            {
                                count: staredSheets.length,
                            },
                        )}
                        style={[
                            styles.segmentButton,
                            index === 1 && {
                                backgroundColor: colors.surfaceSecondary,
                            },
                        ]}
                        onPress={() => {
                            setIndex(1);
                        }}>
                        <ThemeText
                            accessible={false}
                            fontSize="subTitle"
                            fontWeight={index === 1 ? "semibold" : "regular"}
                            fontColor={index === 1 ? "text" : "textSecondary"}>
                            {t("home.starredPlaylists")}
                        </ThemeText>
                    </TouchableOpacity>
                </View>
            </View>
            <FlashList
                ListEmptyComponent={<Empty />}
                extraData={{ t }}
                data={(index === 0 ? allSheets : staredSheets) ?? []}
                estimatedItemSize={ListItem.Size.big}
                renderItem={({ item: sheet }) => {
                    const isLocalSheet = !(
                        sheet.platform &&
                        sheet.platform !== localPluginPlatform
                    );

                    return (
                        <ListItem
                            key={`${sheet.id}`}
                            heightType="big"
                            withHorizontalPadding
                            style={styles.listItem}
                            onPress={() => {
                                if (isLocalSheet) {
                                    navigate(ROUTE_PATH.LOCAL_SHEET_DETAIL, {
                                        id: sheet.id,
                                    });
                                } else {
                                    navigate(ROUTE_PATH.PLUGIN_SHEET_DETAIL, {
                                        sheetInfo: sheet,
                                    });
                                }
                            }}>
                            <ListItem.ListItemImage
                                uri={sheet.coverImg ?? sheet.artwork}
                                fallbackImg={ImgAsset.albumDefault}
                                maskIcon={
                                    sheet.id === MusicSheet.defaultSheet.id
                                        ? "heart"
                                        : null
                                }
                                contentStyle={styles.coverImage}
                            />
                            <ListItem.Content
                                title={sheet.title}
                                description={
                                    isLocalSheet
                                        ? t("home.songCount", {
                                            count: sheet.worksNum,
                                        })
                                        : `${sheet.artist ?? ""}`
                                }
                            />
                            {sheet.id !== MusicSheet.defaultSheet.id ? (
                                <ListItem.ListItemIcon
                                    position="right"
                                    icon="trash-outline"
                                    onPress={() => {
                                        showDialog("SimpleDialog", {
                                            title: t(
                                                "dialog.deleteSheetTitle",
                                            ),
                                            content: t(
                                                "dialog.deleteSheetContent",
                                                {
                                                    name: sheet.title,
                                                },
                                            ),
                                            onOk: async () => {
                                                if (isLocalSheet) {
                                                    await MusicSheet.removeSheet(
                                                        sheet.id,
                                                    );
                                                    Toast.success(
                                                        t("toast.deleteSuccess"),
                                                    );
                                                } else {
                                                    await MusicSheet.unstarMusicSheet(
                                                        sheet,
                                                    );
                                                    Toast.success(
                                                        t("toast.hasUnstarred"),
                                                    );
                                                }
                                            },
                                        });
                                    }}
                                />
                            ) : null}
                        </ListItem>
                    );
                }}
                nestedScrollEnabled
            />
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.lg,
    },
    pageTitle: {
        fontSize: rpx(48),
    },
    segmentedControl: {
        flexDirection: "row",
        alignSelf: "flex-start",
        borderRadius: radius.pill,
        padding: rpx(4),
    },
    segmentButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
    },
    listItem: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    coverImage: {
        borderRadius: radius.sm,
    },
});
