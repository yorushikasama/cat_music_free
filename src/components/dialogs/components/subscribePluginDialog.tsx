import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import ThemeText from "@/components/base/themeText";
import { hideDialog } from "../useDialog";
import Dialog from "./base";
import Input from "@/components/base/input";
import { useI18N } from "@/core/i18n";
import { spacing } from "@/constants/spacing";
import rpx from "@/utils/rpx";

interface ISubscribeItem {
    name: string;
    url: string;
}
interface ISubscribePluginDialogProps {
    subscribeItem?: ISubscribeItem;
    onSubmit: (
        subscribeItem: ISubscribeItem,
        hideDialog: () => void,
        editingIndex?: number,
    ) => void;
    editingIndex?: number;
    onDelete?: (editingIndex: number, hideDialog: () => void) => void;
}

export default function SubscribePluginDialog(
    props: ISubscribePluginDialogProps,
) {
    const { subscribeItem, onSubmit, editingIndex, onDelete } = props;
    const [name, setName] = useState(subscribeItem?.name ?? "");
    const [url, setUrl] = useState(subscribeItem?.url ?? "");

    const { t } = useI18N();

    return (
        <Dialog onDismiss={hideDialog}>
            <Dialog.Title>{t("dialog.subscriptionPluginDialog.title")}</Dialog.Title>
            <Dialog.Content style={style.dialogContent}>
                <View style={style.field}>
                    <ThemeText
                        fontSize="description"
                        fontWeight="bold"
                        fontColor="textSecondary"
                        style={style.label}>
                        {t("common.name")}
                    </ThemeText>
                    <Input
                        variant="outlined"
                        style={style.input}
                        value={name}
                        onChangeText={setName}
                        placeholder={t("common.name")}
                    />
                </View>

                <View style={style.field}>
                    <ThemeText
                        fontSize="description"
                        fontWeight="bold"
                        fontColor="textSecondary"
                        style={style.label}>
                        URL
                    </ThemeText>
                    <Input
                        variant="outlined"
                        style={style.input}
                        value={url}
                        onChangeText={setUrl}
                        placeholder={t("pluginSetting.menu.installPluginDialogPlaceholder")}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
            </Dialog.Content>
            <Dialog.Actions
                actions={[
                    {
                        type: "danger",
                        title: t("common.delete"),
                        show: editingIndex !== undefined,
                        onPress() {
                            onDelete?.(editingIndex!, hideDialog);
                        },
                    },
                    {
                        type: "primary",
                        title: t("common.save"),
                        onPress() {
                            onSubmit(
                                {
                                    name,
                                    url,
                                },
                                hideDialog,
                                editingIndex,
                            );
                        },
                    },
                ]}
            />
        </Dialog>
    );
}

const style = StyleSheet.create({
    dialogContent: {
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    field: {
        marginBottom: spacing.lg,
    },
    label: {
        marginBottom: spacing.xs,
    },
    input: {
        minHeight: rpx(76),
        textAlignVertical: "center",
    },
});
