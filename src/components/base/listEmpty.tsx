import { RequestStateCode } from "@/constants/commonConst";
import { fontSizeConst } from "@/constants/uiConst";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import ThemeText from "./themeText";
import { useI18N } from "@/core/i18n";
import { spacing } from "@/constants/spacing";
import Empty from "./empty";
import Color from "color";

interface IEmptyProps {
    state: RequestStateCode
    onRetry?: () => void;
}
export default function ListEmpty(props: IEmptyProps) {
    const { state, onRetry } = props;

    const colors = useColors();
    const { t } = useI18N();

    if (state === RequestStateCode.FINISHED || state === RequestStateCode.PARTLY_DONE) {
        return (
            <Empty
                icon="archive-box-x-mark"
                title={t("common.emptyList")}
                description={t("common.emptyListDescription")}
                minHeight={rpx(540)}
            />
        );
    } else if (state === RequestStateCode.PENDING_FIRST_PAGE) {
        return <View style={style.wrapper}>
            <View style={[
                style.loadingIndicator,
                {
                    backgroundColor: Color(colors.primary).alpha(0.12).rgb().string(),
                },
            ]}>
                <ActivityIndicator animating color={colors.primary} size={fontSizeConst.appbar}/>
            </View>
            <ThemeText
                fontSize="title"
                fontWeight="semibold">
                {t("common.loading")}
            </ThemeText>
            <ThemeText
                fontSize="subTitle"
                fontColor="textSecondary"
                lineHeight
                style={style.description}>
                {t("common.loadingDescription")}
            </ThemeText>
        </View>;
    } else if (state === RequestStateCode.ERROR) {
        return (
            <Empty
                icon="exclamation-circle"
                title={t("common.error")}
                description={t("common.errorDescription")}
                actionText={t("common.clickToRetry")}
                onAction={onRetry}
                minHeight={rpx(540)}
            />
        );
    }

}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        flex: 1,
        minHeight: rpx(540),
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xxl,
    },
    loadingIndicator: {
        width: rpx(104),
        height: rpx(104),
        borderRadius: rpx(52),
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.md,
    },
    description: {
        textAlign: "center",
        marginTop: spacing.sm,
        maxWidth: rpx(520),
    },
});
