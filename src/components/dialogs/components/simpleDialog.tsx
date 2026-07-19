import React from "react";
import { hideDialog } from "../useDialog";
import Dialog from "./base";
import { useI18N } from "@/core/i18n";
import Toast from "@/utils/toast";

interface ISimpleDialogProps {
    title: string;
    content: string | React.ReactElement;
    okText?: string;
    cancelText?: string;
    onOk?: () => void | Promise<void>;
}
export default function SimpleDialog(props: ISimpleDialogProps) {
    const { title, content, onOk, okText, cancelText } = props;

    const { t } = useI18N();
    const [confirming, setConfirming] = React.useState(false);

    const actions = onOk
        ? [
            {
                title: cancelText ?? t("common.cancel"),
                type: "normal",
                onPress() {
                    if (!confirming) {
                        hideDialog();
                    }
                },
            },
            {
                title: okText ?? t("common.confirm"),
                type: "primary",
                async onPress() {
                    try {
                        setConfirming(true);
                        await onOk?.();
                        hideDialog();
                    } catch (error: any) {
                        Toast.warn(
                            t("toast.unknownError", {
                                reason: error?.message ?? error ?? "",
                            }),
                        );
                    } finally {
                        setConfirming(false);
                    }
                },
            },
        ]
        : ([
            {
                title: okText ?? t("dialog.errorLogKnow"),
                type: "primary",
                onPress() {
                    hideDialog();
                },
            },
        ] as any);

    return (
        <Dialog onDismiss={hideDialog} dismissDisabled={confirming}>
            <Dialog.Title withDivider>{title}</Dialog.Title>
            <Dialog.Content needScroll>{content}</Dialog.Content>
            <Dialog.Actions actions={actions} />
        </Dialog>
    );
}
