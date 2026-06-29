import React, { useEffect, useMemo, useState } from "react";
import { Pressable, SectionList, SectionListData, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import ListItem from "@/components/base/listItem";
import { sizeFormatter } from "@/utils/fileUtils";
import downloader, { DownloadFailReason, DownloadStatus, useDownloadQueue, useDownloadTask } from "@/core/downloader";
import { useI18N } from "@/core/i18n";
import ThemeText from "@/components/base/themeText";
import Icon from "@/components/base/icon";
import useColors from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import Empty from "@/components/base/empty";
import Color from "color";


interface DownloadingListItemProps {
    musicItem: IMusic.IMusicItem;
}
function DownloadingListItem(props: DownloadingListItemProps) {
    const { musicItem } = props;
    const taskInfo = useDownloadTask(musicItem);
    const { t } = useI18N();
    const colors = useColors();

    const status = taskInfo?.status ?? DownloadStatus.Error;
    const progressRatio =
        status === DownloadStatus.Downloading && taskInfo?.downloadedSize && taskInfo?.fileSize
            ? Math.min(1, taskInfo.downloadedSize / taskInfo.fileSize)
            : status === DownloadStatus.Completed
                ? 1
                : 0;

    let description = "";

    if (status === DownloadStatus.Error) {
        const reason = taskInfo?.errorReason;

        if (reason === DownloadFailReason.NoWritePermission) {
            description = t("downloading.downloadFailReason.noWritePermission");
        } else if (reason === DownloadFailReason.FailToFetchSource) {
            description = t("downloading.downloadFailReason.failToFetchSource");
        } else {
            description = t("downloading.downloadFailReason.unknown");
        }
    } else if (status === DownloadStatus.Completed) {
        description = t("downloading.downloadStatus.completed");
    } else if (status === DownloadStatus.Downloading) {
        const progress = taskInfo?.downloadedSize ? sizeFormatter(taskInfo.downloadedSize) : "-";
        const totalSize = taskInfo?.fileSize ? sizeFormatter(taskInfo.fileSize) : "-";

        description = t("downloading.downloadStatus.downloadProgress", {
            progress,
            totalSize,
        });
    } else if (status === DownloadStatus.Pending) {
        description = t("downloading.downloadStatus.pending");
    } else if (status === DownloadStatus.Preparing) {
        description = t("downloading.downloadStatus.preparing");
    }

    const tintColor = status === DownloadStatus.Error
        ? colors.danger ?? "#d14343"
        : status === DownloadStatus.Completed
            ? colors.success ?? "#08A34C"
            : colors.primary;

    return (
        <ListItem
            withHorizontalPadding
            heightType="big"
            style={styles.item}>
            <View
                style={[
                    styles.statusIcon,
                    { backgroundColor: Color(tintColor).alpha(0.12).rgb().string() },
                ]}>
                <Icon
                    name={status === DownloadStatus.Error ? "exclamation-circle" : "arrow-down-tray"}
                    size={rpx(30)}
                    color={tintColor}
                />
            </View>
            <ListItem.Content
                title={musicItem.title}
                description={(
                    <View>
                        <ThemeText
                            numberOfLines={1}
                            fontSize="description"
                            color={status === DownloadStatus.Error ? tintColor : colors.textSecondary}>
                            {description}
                        </ThemeText>
                        {status === DownloadStatus.Downloading ? (
                            <View
                                style={[
                                    styles.progressTrack,
                                    { backgroundColor: colors.surfaceSecondary },
                                ]}>
                                <View
                                    style={[
                                        styles.progressBar,
                                        {
                                            width: `${progressRatio * 100}%`,
                                            backgroundColor: colors.primary,
                                        },
                                    ]}
                                />
                            </View>
                        ) : null}
                    </View>
                )}
            />
            {status === DownloadStatus.Error || status === DownloadStatus.Pending ? (
                <Pressable
                    hitSlop={spacing.sm}
                    onPress={() => downloader.remove(musicItem)}
                    style={styles.removeButton}>
                    <Icon
                        name="trash-outline"
                        size={rpx(28)}
                        color={colors.textSecondary}
                    />
                </Pressable>
            ) : null}
        </ListItem>
    );

}

export default function DownloadingList() {
    const downloadQueue = useDownloadQueue();
    const { t } = useI18N();
    const [taskVersion, setTaskVersion] = useState(0);

    useEffect(() => {
        return downloader.onTaskUpdate(() => {
            setTaskVersion(version => version + 1);
        });
    }, []);

    const sections = useMemo(() => {
        const active: IMusic.IMusicItem[] = [];
        const waiting: IMusic.IMusicItem[] = [];
        const failed: IMusic.IMusicItem[] = [];

        downloadQueue.forEach(item => {
            const status = downloader.getTaskStatus?.(item);
            if (status === DownloadStatus.Error) {
                failed.push(item);
            } else if (status === DownloadStatus.Pending) {
                waiting.push(item);
            } else {
                active.push(item);
            }
        });

        return [
            active.length ? { title: t("downloading.title"), data: active } : null,
            waiting.length ? { title: t("downloading.downloadStatus.pending"), data: waiting } : null,
            failed.length ? { title: t("common.error"), data: failed } : null,
        ].filter(Boolean) as SectionListData<IMusic.IMusicItem>[];
    }, [downloadQueue, t, taskVersion]);


    return (
        <View style={styles.wrapper}>
            <SectionList
                sections={sections}
                keyExtractor={_ => `dl${_.platform}.${_.id}`}
                renderItem={({ item }) => <DownloadingListItem musicItem={item} />}
                renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeader}>
                        <ThemeText
                            fontSize="description"
                            fontColor="textSecondary"
                            fontWeight="semibold">
                            {section.title}
                        </ThemeText>
                    </View>
                )}
                ListEmptyComponent={(
                    <Empty
                        icon="arrow-down-tray"
                        title={t("downloading.title")}
                        description={t("common.emptyListDescription")}
                    />
                )}
                contentContainerStyle={downloadQueue.length ? styles.listContent : styles.emptyContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: rpx(750),
        flex: 1,
    },
    listContent: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.xl,
    },
    emptyContent: {
        flexGrow: 1,
    },
    sectionHeader: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xs,
    },
    item: {
        minHeight: rpx(132),
    },
    statusIcon: {
        width: rpx(64),
        height: rpx(64),
        borderRadius: radius.lg,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.md,
    },
    progressTrack: {
        height: rpx(8),
        borderRadius: radius.pill,
        overflow: "hidden",
        marginTop: spacing.sm,
    },
    progressBar: {
        height: "100%",
        borderRadius: radius.pill,
    },
    removeButton: {
        width: rpx(56),
        height: rpx(56),
        alignItems: "center",
        justifyContent: "center",
    },
});
