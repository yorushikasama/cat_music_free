import React from "react";
import { StyleSheet, View } from "react-native";
import MusicList from "@/components/musicList";
import LocalMusicSheet from "@/core/localMusicSheet";
import { localMusicSheetId, localPluginPlatform, RequestStateCode } from "@/constants/commonConst";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import globalStyle from "@/constants/globalStyle";
import { useI18N } from "@/core/i18n";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import rpx from "@/utils/rpx";
import Icon from "@/components/base/icon";
import Color from "color";
import dayjs from "dayjs";

export default function LocalMusicList() {
    const musicList = LocalMusicSheet.useMusicList();
    const localMeta = LocalMusicSheet.useMeta();
    const { t } = useI18N();
    const colors = useColors();
    const artistCount = new Set(musicList.map(item => item.artist).filter(Boolean)).size;
    const albumCount = new Set(musicList.map(item => item.album).filter(Boolean)).size;

    const Header = (
        <View style={styles.headerWrap}>
            <View
                style={[
                    styles.summary,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.divider,
                    },
                ]}>
                <View
                    style={[
                        styles.summaryIcon,
                        {
                            backgroundColor: Color(colors.primary).alpha(0.12).rgb().string(),
                        },
                    ]}>
                    <Icon
                        name="musical-note"
                        size={rpx(36)}
                        color={colors.primary}
                    />
                </View>
                <View style={styles.summaryContent}>
                    <ThemeText fontSize="subTitle" fontWeight="semibold">
                        {t("home.localMusic")}
                    </ThemeText>
                    <ThemeText
                        fontSize="description"
                        fontColor="textSecondary"
                        style={styles.summaryDesc}>
                        {[
                            t("localMusic.songCount", { count: musicList.length }),
                            t("localMusic.artistCount", { count: artistCount }),
                            t("localMusic.albumCount", { count: albumCount }),
                        ].join(" · ")}
                    </ThemeText>
                    {localMeta.lastScanAt ? (
                        <ThemeText
                            fontSize="description"
                            fontColor="textSecondary"
                            style={styles.scanTime}>
                            {t("localMusic.lastScanAt", {
                                time: dayjs(localMeta.lastScanAt).format("YYYY-MM-DD HH:mm"),
                            })}
                        </ThemeText>
                    ) : null}
                </View>
            </View>
        </View>
    );

    return (
        <HorizontalSafeAreaView style={globalStyle.flex1}>
            <MusicList
                Header={Header}
                musicList={musicList}
                showIndex
                state={RequestStateCode.IDLE}
                musicSheet={{
                    id: localMusicSheetId,
                    title: t("common.local"),
                    platform: localPluginPlatform,
                    musicList: musicList,
                }}
            />
        </HorizontalSafeAreaView>
    );
}

const styles = StyleSheet.create({
    headerWrap: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
    },
    summary: {
        minHeight: rpx(112),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
    },
    summaryIcon: {
        width: rpx(68),
        height: rpx(68),
        borderRadius: radius.lg,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.md,
    },
    summaryContent: {
        flex: 1,
    },
    summaryDesc: {
        marginTop: rpx(6),
    },
    scanTime: {
        marginTop: rpx(6),
    },
});
