import React, { Fragment, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import rpx from "@/utils/rpx";
import ThemeText from "@/components/base/themeText";

import { qualityKeys, qualityText } from "@/utils/qualities";
import { sizeFormatter } from "@/utils/fileUtils";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PanelBase from "../base/panelBase";
import { ScrollView } from "react-native-gesture-handler";
import { hidePanel } from "../usePanel";
import Divider from "@/components/base/divider";
import PanelHeader from "../base/panelHeader";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";

interface IMusicQualityProps {
    type?: "play" | "download";
    /** 歌曲信息 */
    musicItem: IMusic.IMusicItem;
    /** 点击回调 */
    onQualityPress: (
        quality: IMusic.IQualityKey,
        musicItem: IMusic.IMusicItem,
    ) => void | Promise<void>;
}

export default function MusicQuality(props: IMusicQualityProps) {
    const safeAreaInsets = useSafeAreaInsets();
    const i18n = useI18N();
    const colors = useColors();

    const { musicItem, onQualityPress, type = "play" } = props ?? {};
    const [selectingQuality, setSelectingQuality] =
        useState<IMusic.IQualityKey | null>(null);
    const selectionLockRef = useRef(false);

    const handleQualityPress = async (quality: IMusic.IQualityKey) => {
        if (selectionLockRef.current) {
            return;
        }

        selectionLockRef.current = true;
        setSelectingQuality(quality);
        try {
            await onQualityPress(quality, musicItem);
            hidePanel();
        } finally {
            selectionLockRef.current = false;
            setSelectingQuality(null);
        }
    };

    return (
        <PanelBase
            height={rpx(520)}
            dismissDisabled={selectingQuality !== null}
            renderBody={() => (
                <>
                    <PanelHeader
                        title={i18n.t("panel.musicQuality.title", {
                            type:
                                type === "play"
                                    ? i18n.t("common.play")
                                    : i18n.t("common.download"),
                        })}
                        hideButtons
                    />
                    <Divider />

                    <ScrollView
                        style={[
                            style.body,
                            {
                                marginBottom: safeAreaInsets.bottom,
                            },
                        ]}>
                        {qualityKeys.map(key => {
                            return (
                                <Fragment key={`frag-${key}`}>
                                    <Pressable
                                        key={`btn-${key}`}
                                        accessibilityRole="button"
                                        accessibilityLabel={qualityText[key]}
                                        accessibilityState={{
                                            busy: selectingQuality === key,
                                            disabled: selectingQuality !== null,
                                        }}
                                        android_ripple={{
                                            color: colors.pressedOverlay,
                                        }}
                                        disabled={selectingQuality !== null}
                                        style={({ pressed }) => [
                                            style.item,
                                            pressed ? style.itemPressed : null,
                                        ]}
                                        onPress={() => handleQualityPress(key)}>
                                        {selectingQuality === key ? (
                                            <ActivityIndicator
                                                color={colors.primary}
                                                size="small"
                                            />
                                        ) : (
                                            <ThemeText>
                                                {qualityText[key]}{" "}
                                                {musicItem.qualities?.[key]?.size
                                                    ? `(${sizeFormatter(
                                                          musicItem.qualities[key]
                                                              .size!,
                                                    )})`
                                                    : ""}
                                            </ThemeText>
                                        )}
                                    </Pressable>
                                </Fragment>
                            );
                        })}
                    </ScrollView>
                </>
            )}
        />
    );
}

const style = StyleSheet.create({
    header: {
        width: rpx(750),
        flexDirection: "row",
        padding: rpx(24),
    },
    body: {
        flex: 1,
        paddingHorizontal: rpx(24),
    },
    item: {
        height: rpx(96),
        justifyContent: "center",
    },
    itemPressed: {
        opacity: 0.72,
    },
});
