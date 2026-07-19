import React, { Fragment, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import rpx from "@/utils/rpx";
import ThemeText from "@/components/base/themeText";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import PanelBase from "../base/panelBase";
import { ScrollView } from "react-native-gesture-handler";
import { hidePanel } from "../usePanel";
import Divider from "@/components/base/divider";
import PanelHeader from "../base/panelHeader";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";

interface IPlayRateProps {
    /** 点击回调 */
    onRatePress: (rate: number) => void | Promise<void>;
}

const rates = [50, 75, 100, 125, 150, 175, 200];

export default function PlayRate(props: IPlayRateProps) {
    const { onRatePress } = props ?? {};
    const i18n = useI18N();
    const colors = useColors();

    const safeAreaInsets = useSafeAreaInsets();
    const [selectingRate, setSelectingRate] = useState<number | null>(null);
    const selectionLockRef = useRef(false);

    const handleRatePress = async (rate: number) => {
        if (selectionLockRef.current) {
            return;
        }

        selectionLockRef.current = true;
        setSelectingRate(rate);
        try {
            await onRatePress(rate);
            hidePanel();
        } finally {
            selectionLockRef.current = false;
            setSelectingRate(null);
        }
    };

    return (
        <PanelBase
            height={rpx(520)}
            dismissDisabled={selectingRate !== null}
            renderBody={() => (
                <>
                    <PanelHeader
                        title={i18n.t("panel.playRate.title")}
                        hideButtons
                    />
                    <ScrollView
                        style={[
                            style.body,
                            { marginBottom: safeAreaInsets.bottom },
                        ]}>
                        {rates.map(key => {
                            return (
                                <Fragment key={`frag-${key}`}>
                                    <Pressable
                                        key={`btn-${key}`}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${key / 100}x`}
                                        accessibilityState={{
                                            busy: selectingRate === key,
                                            disabled: selectingRate !== null,
                                        }}
                                        android_ripple={{
                                            color: colors.pressedOverlay,
                                        }}
                                        disabled={selectingRate !== null}
                                        style={({ pressed }) => [
                                            style.item,
                                            pressed ? style.itemPressed : null,
                                        ]}
                                        onPress={() => handleRatePress(key)}>
                                        {selectingRate === key ? (
                                            <ActivityIndicator
                                                color={colors.primary}
                                                size="small"
                                            />
                                        ) : (
                                            <ThemeText>{key / 100}x</ThemeText>
                                        )}
                                    </Pressable>
                                </Fragment>
                            );
                        })}
                        <Divider />
                    </ScrollView>
                </>
            )}
        />
    );
}

const style = StyleSheet.create({
    header: {
        width: "100%",
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
