import Image from "@/components/base/image.tsx";
import Input from "@/components/base/input.tsx";
import ThemeText from "@/components/base/themeText.tsx";
import PanelBase from "@/components/panels/base/panelBase.tsx";
import PanelHeader from "@/components/panels/base/panelHeader.tsx";
import { hidePanel } from "@/components/panels/usePanel.ts";
import { ImgAsset } from "@/constants/assetsConst.ts";
import pathConst from "@/constants/pathConst.ts";
import { fontSizeConst } from "@/constants/uiConst.ts";
import { useI18N } from "@/core/i18n";
import MusicSheet from "@/core/musicSheet";
import useColors from "@/hooks/useColors.ts";
import { addFileScheme, addRandomHash } from "@/utils/fileUtils.ts";
import rpx, { vmax } from "@/utils/rpx";
import Toast from "@/utils/toast.ts";
import { readAsStringAsync } from "expo-file-system";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { exists, unlink, writeFile } from "react-native-fs";
import { launchImageLibrary } from "react-native-image-picker";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import Color from "color";

interface IEditSheetDetailProps {
  musicSheet: IMusic.IMusicSheetItem;
}

export default function EditMusicSheetInfo(props: IEditSheetDetailProps) {
    const { musicSheet } = props;
    const colors = useColors();
    const { t } = useI18N();

    const [coverImg, setCoverImg] = useState(musicSheet?.coverImg);
    const [title, setTitle] = useState(musicSheet?.title);

    const onChangeCoverPress = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: "photo",
            });
            const uri = result.assets?.[0].uri;
            if (!uri) {
                return;
            }
            console.log(uri);
            setCoverImg(uri);
        } catch (e) {
            console.log(e);
        }
    };

    function onTitleChange(_: string) {
        setTitle(_);
    }

    async function onConfirm() {
    // 判断是否相同
        if (
            coverImg === musicSheet?.coverImg &&
      title === musicSheet?.title
        ) {
            hidePanel();
            return;
        }

        let newCoverImg = coverImg;
        if (coverImg && coverImg !== musicSheet?.coverImg) {
            newCoverImg = addFileScheme(
                `${pathConst.dataPath}sheet${musicSheet.id}${coverImg.substring(
                    coverImg.lastIndexOf("."),
                )}`,
            );
            try {
                if ((await exists(newCoverImg))) {
                    await unlink(newCoverImg);
                }

                // Copy
                const rawImage = await readAsStringAsync(coverImg, {
                    encoding: "base64",
                });
                await writeFile(newCoverImg, rawImage, "base64");
            } catch (e) {
                console.log(e);
            }
        }
        let _title = title;
        if (!_title?.length) {
            _title = musicSheet.title;
        }
        // 更新歌单信息
        MusicSheet.updateMusicSheetBase(musicSheet.id, {
            coverImg: newCoverImg ? addRandomHash(newCoverImg) : undefined,
            title: _title,
        }).then(() => {
            Toast.success(t("panel.editMusicSheetInfo.toast.updateSuccess"));
        });
        hidePanel();
    }

    return (
        <PanelBase
            keyboardAvoidBehavior="height"
            height={vmax(58)}
            renderBody={() => (
                <>
                    <PanelHeader
                        title={t("panel.editMusicSheetInfo.title")}
                        onCancel={hidePanel}
                        onOk={onConfirm}
                    />
                    <ScrollView
                        style={style.body}
                        contentContainerStyle={style.bodyContent}
                        keyboardShouldPersistTaps="handled">
                        <View
                            style={[
                                style.coverSection,
                                {
                                    backgroundColor: colors.surfaceSecondary,
                                    borderColor: colors.divider,
                                },
                            ]}>
                            <TouchableOpacity
                                activeOpacity={0.82}
                                onPress={onChangeCoverPress}
                                onLongPress={() => {
                                    setCoverImg(undefined);
                                }}
                                style={[
                                    style.coverButton,
                                    { shadowColor: colors.shadow },
                                ]}>
                                <Image
                                    style={style.coverImg}
                                    uri={coverImg}
                                    emptySrc={ImgAsset.albumDefault}
                                />
                            </TouchableOpacity>
                            <View style={style.coverCopy}>
                                <ThemeText
                                    fontSize="title"
                                    fontWeight="semibold">
                                    {t("common.cover")}
                                </ThemeText>
                                <ThemeText
                                    fontSize="description"
                                    fontColor="textSecondary"
                                    lineHeight
                                    style={style.coverHint}>
                                    {t("panel.editMusicSheetInfo.title")}
                                </ThemeText>
                            </View>
                        </View>

                        <View
                            style={[
                                style.fieldCard,
                                {
                                    backgroundColor: colors.surfaceSecondary,
                                    borderColor: colors.divider,
                                },
                            ]}>
                            <ThemeText
                                fontSize="description"
                                fontColor="textSecondary"
                                style={style.fieldLabel}>
                                {t("panel.editMusicSheetInfo.sheetName")}
                            </ThemeText>
                            <Input
                                numberOfLines={1}
                                value={title}
                                hasHorizontalPadding={false}
                                onChangeText={onTitleChange}
                                style={[
                                    style.input,
                                    {
                                        color: colors.text,
                                        borderBottomColor: Color(colors.text)
                                            .alpha(0.18)
                                            .rgb()
                                            .string(),
                                    },
                                ]}
                            />
                        </View>

                        <Pressable
                            accessibilityRole="button"
                            onPress={onConfirm}
                            style={({ pressed }) => [
                                style.primaryButton,
                                {
                                    backgroundColor: colors.primary,
                                    opacity: pressed ? 0.82 : 1,
                                },
                            ]}>
                            <ThemeText
                                fontSize="subTitle"
                                fontWeight="semibold"
                                color="#ffffff">
                                {t("common.confirm")}
                            </ThemeText>
                        </Pressable>
                    </ScrollView>
                </>
            )}
        />
    );
}

const style = StyleSheet.create({
    body: {
        flex: 1,
    },
    bodyContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    coverSection: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.xl,
        padding: spacing.md,
    },
    coverButton: {
        width: rpx(148),
        height: rpx(148),
        borderRadius: radius.xl,
        shadowOffset: { width: 0, height: rpx(6) },
        shadowOpacity: 0.16,
        shadowRadius: rpx(10),
        elevation: 5,
    },
    coverImg: {
        width: "100%",
        height: "100%",
        borderRadius: radius.xl,
        overflow: "hidden",
    },
    coverCopy: {
        flex: 1,
        marginLeft: spacing.lg,
    },
    coverHint: {
        marginTop: spacing.xs,
    },
    fieldCard: {
        marginTop: spacing.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    fieldLabel: {
        marginBottom: spacing.sm,
    },
    input: {
        height: fontSizeConst.content * 2.5,
        borderBottomWidth: StyleSheet.hairlineWidth,
        includeFontPadding: false,
    },
    primaryButton: {
        marginTop: spacing.lg,
        minHeight: rpx(72),
        borderRadius: radius.pill,
        justifyContent: "center",
        alignItems: "center",
    },
});
