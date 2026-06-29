import Icon, { IIconName } from "@/components/base/icon.tsx";
import ThemeText from "@/components/base/themeText";
import { showPanel } from "@/components/panels/usePanel";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import downloader from "@/core/downloader";
import { useI18N } from "@/core/i18n";
import { useParams } from "@/core/router";
import TrackPlayer from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import Toast from "@/utils/toast";
import Color from "color";
import { produce } from "immer";
import { useAtom, useSetAtom } from "jotai";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { editingMusicListAtom, musicListChangedAtom } from "../store/atom";

export default function Bottom() {
    const { musicSheet } = useParams<"music-list-editor">();
    const [editingMusicList, setEditingMusicList] =
        useAtom(editingMusicListAtom);
    const setMusicListChanged = useSetAtom(musicListChangedAtom);
    const { t } = useI18N();
    const colors = useColors();

    const selectedEditorItems = useMemo(
        () => editingMusicList.filter(_ => _.checked),
        [editingMusicList],
    );

    const selectedItems = useMemo(
        () => selectedEditorItems.map(_ => _.musicItem),
        [selectedEditorItems],
    );

    const selectedCount = selectedItems.length;
    const canUseSelection = selectedCount > 0;
    const canDelete = canUseSelection && !!musicSheet?.id;

    function resetSelectedIndices() {
        setEditingMusicList(
            editingMusicList.map(_ => ({
                musicItem: _.musicItem,
                checked: false,
            })),
        );
    }

    return (
        <View
            style={[
                style.wrapper,
                {
                    backgroundColor: colors.surfacePrimary,
                    borderTopColor: colors.divider,
                },
            ]}>
            <View style={style.selectionInfo}>
                <ThemeText
                    fontSize="subTitle"
                    fontWeight="semibold"
                    numberOfLines={1}>
                    {t("musicListEditor.selectMusicCount", { count: selectedCount })}
                </ThemeText>
            </View>
            <View style={style.actions}>
                <BottomIcon
                    icon="motion-play"
                    title={t("musicListEditor.addToNextPlay")}
                    disabled={!canUseSelection}
                    onPress={async () => {
                        if (!canUseSelection) {
                            return;
                        }
                        TrackPlayer.addNext(selectedItems);
                        resetSelectedIndices();
                        Toast.success(t("toast.addToNextPlay"));
                    }}
                />
                <BottomIcon
                    icon="folder-plus"
                    title={t("musicListEditor.addToSheet")}
                    disabled={!canUseSelection}
                    onPress={() => {
                        if (canUseSelection) {
                            showPanel("AddToMusicSheet", {
                                musicItem: selectedItems,
                            });
                            resetSelectedIndices();
                        }
                    }}
                />
                <BottomIcon
                    icon="arrow-down-tray"
                    title={t("common.download")}
                    disabled={!canUseSelection}
                    onPress={() => {
                        if (canUseSelection) {
                            downloader.download(selectedItems);
                            Toast.success(
                                t("toast.beginDownload"),
                            );
                            resetSelectedIndices();
                        }
                    }}
                />
                <BottomIcon
                    icon="trash-outline"
                    title={t("common.delete")}
                    disabled={!canDelete}
                    danger={canDelete}
                    onPress={() => {
                        if (canDelete) {
                            setEditingMusicList(
                                produce(prev => prev.filter(_ => !_.checked)),
                            );
                            setMusicListChanged(true);
                            Toast.warn(t("toast.rememberToSave"));
                        }
                    }}
                />
            </View>
        </View>
    );
}

interface IBottomIconProps {
    icon: IIconName;
    title: string;
    disabled?: boolean;
    danger?: boolean;
    onPress: () => void;
}
function BottomIcon(props: IBottomIconProps) {
    const { icon, title, onPress, disabled, danger } = props;
    const colors = useColors();
    const iconColor = disabled
        ? colors.textSecondary
        : danger
            ? colors.danger ?? colors.text
            : colors.text;
    const backgroundColor = disabled
        ? colors.surfaceSecondary
        : danger
            ? Color(colors.danger ?? colors.primary).alpha(0.1).rgb().string()
            : Color(colors.primary).alpha(0.1).rgb().string();

    return (
        <Pressable
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [
                style.bottomIconWrapper,
                {
                    backgroundColor,
                    borderColor: disabled
                        ? colors.divider
                        : Color(iconColor).alpha(0.18).rgb().string(),
                    opacity: pressed ? 0.78 : 1,
                },
            ]}>
            <Icon
                name={icon}
                color={iconColor}
                size={rpx(28)}
            />
            <ThemeText
                fontSize="description"
                color={iconColor}
                opacity={disabled ? 0.62 : undefined}
                numberOfLines={1}
                style={style.bottomIconText}>
                {title}
            </ThemeText>
        </Pressable>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        minHeight: rpx(132),
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    selectionInfo: {
        width: rpx(184),
        paddingRight: spacing.sm,
    },
    actions: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: spacing.sm,
    },
    bottomIconWrapper: {
        flex: 1,
        minWidth: 0,
        height: rpx(88),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: rpx(6),
    },
    bottomIconText: {
        marginTop: rpx(8),
        textAlign: "center",
    },
});
