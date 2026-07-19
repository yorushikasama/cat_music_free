import { fontSizeConst } from "@/constants/uiConst";
import useColors from "@/hooks/useColors";
import rpx, { vmax } from "@/utils/rpx";
import React, { useState } from "react";
import { StyleSheet } from "react-native";

import MusicSheet from "@/core/musicSheet";
import { TextInput } from "react-native-gesture-handler";
import PanelBase from "../base/panelBase";
import PanelHeader from "../base/panelHeader";
import { hidePanel } from "../usePanel";
import { useI18N } from "@/core/i18n";
import Toast from "@/utils/toast";

interface ICreateMusicSheetProps {
    defaultName?: string;
    onSheetCreated?: (sheetId: string) => void;
    onCancel?: () => void;
}

export default function CreateMusicSheet(props: ICreateMusicSheetProps) {
    const { t } = useI18N();

    const {
        onSheetCreated,
        onCancel,
        defaultName = t("panel.createMusicSheet.title"),
    } = props;

    const [input, setInput] = useState("");
    const [creating, setCreating] = useState(false);
    const colors = useColors();

    return (
        <PanelBase
            height={vmax(30)}
            keyboardAvoidBehavior="height"
            dismissDisabled={creating}
            renderBody={() => (
                <>
                    <PanelHeader
                        title={t("panel.createMusicSheet.title")}
                        onCancel={() => {
                            if (creating) {
                                return;
                            }
                            onCancel ? onCancel() : hidePanel();
                        }}
                        onOk={async () => {
                            if (creating) {
                                return;
                            }

                            setCreating(true);
                            try {
                                const sheetId = await MusicSheet.addSheet(
                                    input || defaultName,
                                );
                                await onSheetCreated?.(sheetId);
                                hidePanel();
                            } catch (e: any) {
                                Toast.warn(
                                    t("toast.unknownError", {
                                        reason: e?.message ?? "",
                                    }),
                                );
                            } finally {
                                setCreating(false);
                            }
                        }}
                    />
                    <TextInput
                        value={input}
                        onChangeText={_ => {
                            setInput(_);
                        }}
                        editable={!creating}
                        autoFocus
                        accessible
                        accessibilityLabel={t(
                            "panel.createMusicSheet.inputLabel",
                        )}
                        accessibilityHint={t("panel.createMusicSheet.title")}
                        style={[
                            style.input,
                            {
                                color: colors.text,
                                backgroundColor: colors.placeholder,
                            },
                        ]}
                        placeholderTextColor={colors.textSecondary}
                        placeholder={defaultName}
                        maxLength={200}
                    />
                </>
            )}
        />
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: rpx(750),
    },
    operations: {
        width: rpx(750),
        paddingHorizontal: rpx(24),
        flexDirection: "row",
        height: rpx(100),
        alignItems: "center",
        justifyContent: "space-between",
    },
    input: {
        margin: rpx(24),
        borderRadius: rpx(12),
        fontSize: fontSizeConst.content,
        lineHeight: fontSizeConst.content * 1.5,
        padding: rpx(12),
    },
});
