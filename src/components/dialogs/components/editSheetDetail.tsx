import React, { useCallback, useState } from "react";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import ThemeText from "@/components/base/themeText";
import { ImgAsset } from "@/constants/assetsConst";
import { launchImageLibrary } from "react-native-image-picker";
import pathConst from "@/constants/pathConst";
import Image from "@/components/base/image";
import { addFileScheme, addRandomHash } from "@/utils/fileUtils";
import Toast from "@/utils/toast";
import { hideDialog } from "../useDialog";
import Dialog from "./base";
import Input from "@/components/base/input";
import { fontSizeConst } from "@/constants/uiConst";
import { copyAsync, deleteAsync, getInfoAsync } from "expo-file-system";
import MusicSheet from "@/core/musicSheet";
import { useI18N } from "@/core/i18n";

interface IEditSheetDetailProps {
    musicSheet: IMusic.IMusicSheetItem;
}
export default function EditSheetDetailDialog(props: IEditSheetDetailProps) {
    const { musicSheet } = props;
    const colors = useColors();

    const [coverImg, setCoverImg] = useState(musicSheet?.coverImg);
    const [title, setTitle] = useState(musicSheet?.title);
    const [selectingCover, setSelectingCover] = useState(false);
    const [saving, setSaving] = useState(false);
    const titleInputColorStyle = { borderBottomColor: colors.text };

    const { t } = useI18N();

    // onCover

    const onChangeCoverPress = useCallback(async () => {
        if (selectingCover) {
            return;
        }

        setSelectingCover(true);
        try {
            const result = await launchImageLibrary({
                mediaType: "photo",
            });
            const uri = result.assets?.[0].uri;
            if (!uri) {
                return;
            }
            setCoverImg(uri);
        } catch (e: any) {
            Toast.warn(t("toast.unknownError", { reason: e?.message ?? "" }));
        } finally {
            setSelectingCover(false);
        }
    }, [selectingCover, t]);

    function onTitleChange(_: string) {
        setTitle(_);
    }

    const onConfirm = useCallback(async () => {
        if (saving) {
            return;
        }

        setSaving(true);
        try {
            // 判断是否相同
            if (
                coverImg === musicSheet?.coverImg &&
                title === musicSheet?.title
            ) {
                hideDialog();
                return;
            }

            let newCoverImg = coverImg;
            if (coverImg && coverImg !== musicSheet?.coverImg) {
                newCoverImg = addFileScheme(
                    `${pathConst.dataPath}sheet${
                        musicSheet.id
                    }${coverImg.substring(coverImg.lastIndexOf("."))}`,
                );
                if ((await getInfoAsync(newCoverImg)).exists) {
                    await deleteAsync(newCoverImg, {
                        idempotent: true, // 报错时不抛异常
                    });
                }
                await copyAsync({
                    from: coverImg,
                    to: newCoverImg,
                });
            }

            let _title = title;
            if (!_title?.length) {
                _title = musicSheet.title;
            }
            // 更新歌单信息
            await MusicSheet.updateMusicSheetBase(musicSheet.id, {
                coverImg: newCoverImg ? addRandomHash(newCoverImg) : undefined,
                title: _title,
            });
            Toast.success(t("panel.editMusicSheetInfo.toast.updateSuccess"));
            hideDialog();
        } catch (e: any) {
            Toast.warn(t("toast.unknownError", { reason: e?.message ?? "" }));
        } finally {
            setSaving(false);
        }
    }, [coverImg, musicSheet, saving, t, title]);

    return (
        <Dialog
            onDismiss={hideDialog}
            dismissDisabled={selectingCover || saving}>
            <Dialog.Content>
                <View style={style.row}>
                    <ThemeText>{t("common.cover")}</ThemeText>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t("common.cover")}
                        accessibilityState={{ busy: selectingCover }}
                        disabled={selectingCover || saving}
                        onPress={onChangeCoverPress}
                        onLongPress={() => {
                            if (selectingCover || saving) {
                                return;
                            }
                            setCoverImg(undefined);
                        }}>
                        {selectingCover ? (
                            <View style={[style.coverImg, style.coverLoading]}>
                                <ActivityIndicator
                                    color={colors.primary}
                                    size="small"
                                />
                            </View>
                        ) : (
                            <Image
                                style={style.coverImg}
                                uri={coverImg}
                                emptySrc={ImgAsset.albumDefault}
                            />
                        )}
                    </TouchableOpacity>
                </View>
                <View style={style.row}>
                    <ThemeText>
                        {t("dialog.editSheetDetail.sheetName")}
                    </ThemeText>
                    <Input
                        numberOfLines={1}
                        textAlign="right"
                        value={title}
                        editable={!selectingCover && !saving}
                        hasHorizontalPadding={false}
                        onChangeText={onTitleChange}
                        style={[style.titleInput, titleInputColorStyle]}
                    />
                </View>
            </Dialog.Content>
            <Dialog.Actions
                actions={[
                    {
                        title: t("common.cancel"),
                        type: "normal",
                        disabled: selectingCover || saving,
                        onPress: hideDialog,
                    },
                    {
                        title: t("common.confirm"),
                        type: "primary",
                        disabled: selectingCover || saving,
                        onPress: onConfirm,
                    },
                ]}
            />
        </Dialog>
    );
}

const style = StyleSheet.create({
    row: {
        marginTop: rpx(28),
        height: rpx(120),
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: rpx(12),
    },
    coverImg: {
        width: rpx(100),
        height: rpx(100),
        borderRadius: rpx(28),
        overflow: "hidden",
    },
    coverLoading: {
        alignItems: "center",
        justifyContent: "center",
    },
    titleInput: {
        height: fontSizeConst.content * 2.5,
        width: "50%",
        borderBottomWidth: 1,
        includeFontPadding: false,
    },
});
