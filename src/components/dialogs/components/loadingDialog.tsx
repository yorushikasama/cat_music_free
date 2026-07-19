import React, { useEffect, useRef, useState } from "react";
import Loading from "@/components/base/loading";
import rpx from "@/utils/rpx";
import { StyleSheet } from "react-native";
import { hideDialog } from "../useDialog";
import Dialog from "./base";
import { useI18N } from "@/core/i18n";
import Toast from "@/utils/toast";

interface ILoadingDialogProps<T extends any = any> {
    promise?: Promise<T>;
    task?: () => Promise<T>;
    title: string;
    loadingText?: string;
    onResolve?: (data: T, hideDialog: () => void) => void;
    onReject?: (reason: any, hideDialog: () => void) => void;
    onCancel?: (hideDialog: () => void) => void;
}
export default function LoadingDialog(props: ILoadingDialogProps) {
    const { title, loadingText, onResolve, onReject, promise, task, onCancel } =
        props;
    
    const { t } = useI18N();
    const taskRef = useRef({ promise, task, onResolve, onReject, onCancel });
    const startedRef = useRef(false);
    const [settled, setSettled] = useState(false);

    useEffect(() => {
        if (startedRef.current) {
            return;
        }
        startedRef.current = true;

        const current = taskRef.current;
        const _promise = current.promise || current.task?.();
        _promise
            ?.then(data => {
                setSettled(true);
                current.onResolve?.(data, hideDialog);
            })
            .catch(e => {
                setSettled(true);
                if (current.onReject) {
                    current.onReject(e, hideDialog);
                } else {
                    Toast.warn(
                        t("toast.unknownError", {
                            reason: e?.message ?? e,
                        }),
                    );
                    hideDialog();
                }
            });
    // 任务只允许在弹窗挂载时启动一次；taskRef 刻意保存首次传入的回调。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Dialog onDismiss={settled ? hideDialog : undefined} dismissDisabled={!settled}>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Content style={style.content}>
                <Loading text={loadingText || t("common.loading")} />
            </Dialog.Content>
            <Dialog.Actions
                actions={[
                    {
                        title: t("common.cancel"),
                        show: !!onCancel,
                        onPress() {
                            if (!taskRef.current.onCancel) {
                                return;
                            }
                            taskRef.current.onCancel(hideDialog);
                        },
                    },
                ]}
            />
        </Dialog>
    );
}

const style = StyleSheet.create({
    content: {
        height: rpx(280),
    },
    cancelBtn: {
        marginRight: rpx(12),
        marginBottom: rpx(4),
    },
});
