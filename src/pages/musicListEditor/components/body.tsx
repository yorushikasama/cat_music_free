import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import Button from "@/components/base/textButton.tsx";
import { useAtom } from "jotai";
import { editingMusicListAtom, musicListChangedAtom } from "../store/atom";
import Toast from "@/utils/toast";
import MusicList from "./musicList";
import { useParams } from "@/core/router";
import {
    localMusicSheetId,
    musicHistorySheetId,
} from "@/constants/commonConst";
import LocalMusicSheet from "@/core/localMusicSheet";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import globalStyle from "@/constants/globalStyle";
import musicHistory from "@/core/musicHistory";
import MusicSheet from "@/core/musicSheet";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";

export default function Body() {
    const { musicSheet } = useParams<"music-list-editor">();

    const { t } = useI18N();
    const colors = useColors();
    const [editingMusicList, setEditingMusicList] =
        useAtom(editingMusicListAtom);
    const [musicListChanged, setMusicListChanged] =
        useAtom(musicListChangedAtom);
    const selectedItems = useMemo(
        () => editingMusicList.filter(_ => _.checked),
        [editingMusicList],
    );
    const shouldSelectAll =
        selectedItems.length !== editingMusicList.length &&
        editingMusicList.length > 0;
    const canSave = musicListChanged && !!musicSheet?.id;
    const [saving, setSaving] = useState(false);

    const saveChanges = useCallback(async () => {
        if (!canSave || !musicSheet?.id || saving) {
            return;
        }

        setSaving(true);
        try {
            if (musicSheet.id === localMusicSheetId) {
                await LocalMusicSheet.updateMusicList(
                    editingMusicList.map(_ => _.musicItem),
                );
            } else if (musicSheet.id === musicHistorySheetId) {
                await musicHistory.setHistory(
                    editingMusicList.map(_ => _.musicItem),
                );
            } else {
                await MusicSheet.manualSort(
                    musicSheet.id,
                    editingMusicList.map(_ => _.musicItem),
                );
            }

            Toast.success(t("toast.saveSuccess"));
            setMusicListChanged(false);
        } catch (error: any) {
            Toast.warn(
                t("toast.unknownError", {
                    reason: error?.message ?? error,
                }),
            );
        } finally {
            setSaving(false);
        }
    }, [
        canSave,
        editingMusicList,
        musicSheet?.id,
        saving,
        setMusicListChanged,
        t,
    ]);

    return (
        <HorizontalSafeAreaView style={globalStyle.flex1}>
            <View
                style={[
                    style.header,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderBottomColor:
                            colors.controlBorder ?? colors.divider,
                    },
                ]}>
                <Button
                    withHorizontalPadding
                    style={[
                        style.headerButton,
                        {
                            backgroundColor: colors.controlBackground,
                            borderColor: colors.controlBorder ?? colors.divider,
                        },
                    ]}
                    onPress={() => {
                        if (shouldSelectAll) {
                            setEditingMusicList(
                                editingMusicList.map(_ => ({
                                    musicItem: _.musicItem,
                                    checked: true,
                                })),
                            );
                        } else {
                            setEditingMusicList(
                                editingMusicList.map(_ => ({
                                    musicItem: _.musicItem,
                                    checked: false,
                                })),
                            );
                        }
                    }}>
                    {`${
                        shouldSelectAll
                            ? t("common.selectAll")
                            : t("common.unselectAll")
                    } (${t("musicListEditor.selectMusicCount", {
                        count: selectedItems.length,
                    })})`}
                </Button>
                <Button
                    withHorizontalPadding
                    fontColor={canSave ? "primary" : "textSecondary"}
                    style={[
                        style.headerButton,
                        canSave && !saving ? null : style.headerButtonDisabled,
                        {
                            backgroundColor: canSave
                                ? colors.selectedBackground
                                : colors.controlBackground,
                            borderColor: canSave
                                ? colors.selectedBorder
                                : colors.controlBorder ?? colors.divider,
                        },
                    ]}
                    disabled={!canSave || saving}
                    loading={saving}
                    accessibilityLabel={
                        saving ? t("common.loading") : t("common.save")
                    }
                    onPress={saveChanges}>
                    {saving ? t("common.loading") : t("common.save")}
                </Button>
            </View>
            <MusicList />
        </HorizontalSafeAreaView>
    );
}

const style = StyleSheet.create({
    header: {
        flexDirection: "row",
        minHeight: rpx(88),
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: spacing.sm,
    },
    headerButton: {
        minHeight: rpx(56),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
    headerButtonDisabled: {
        opacity: 0.68,
    },
});
