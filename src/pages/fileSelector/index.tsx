import Empty from "@/components/base/empty";
import IconButton from "@/components/base/iconButton";
import Button from "@/components/base/textButton.tsx";
import ThemeText from "@/components/base/themeText";
import globalStyle from "@/constants/globalStyle";
import i18n from "@/core/i18n";
import { useParams } from "@/core/router";
import useColors from "@/hooks/useColors";
import useHardwareBack from "@/hooks/useHardwareBack";
import rpx from "@/utils/rpx";
import { useNavigation } from "@react-navigation/native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import {
    ExternalStorageDirectoryPath,
    exists,
    getAllExternalFilesDirs,
    readDir,
} from "react-native-fs";
import { FlatList } from "react-native-gesture-handler";
import FileItem from "./fileItem";
import PageShell from "@/components/base/pageShell";
import SkeletonList from "@/components/base/skeleton";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import Toast from "@/utils/toast";

interface IPathItem {
    path: string;
    parent: null | IPathItem;
}

interface IFileItem {
    path: string;
    type: "file" | "folder";
}

const ITEM_HEIGHT = rpx(96);

export default function FileSelector() {
    const {
        fileType = "file-and-folder",
        multi = true,
        actionText = i18n.t("common.sure"),
        matchExtension,
        onAction,
    } = useParams<"file-selector">() ?? {};

    const [currentPath, setCurrentPath] = useState<IPathItem>({
        path: "/",
        parent: null,
    });
    const currentPathRef = useRef<IPathItem>(currentPath);
    const [filesData, setFilesData] = useState<IFileItem[]>([]);
    const [checkedItems, setCheckedItems] = useState<IFileItem[]>([]);

    const checkedPathSet = useMemo(
        () => new Set(checkedItems.map(item => item.path)),
        [checkedItems],
    );
    const navigation = useNavigation();
    const colors = useColors();
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const actionLockRef = useRef(false);
    const canGoParent = currentPath.parent !== null;
    const currentLocation =
        currentPath.path === "/"
            ? i18n.t("fileSelector.storageRoots")
            : currentPath.path;

    useEffect(() => {
        currentPathRef.current = currentPath;
    }, [currentPath]);

    useEffect(() => {
        (async () => {
            // 路径变化时，重新读取
            setLoading(true);
            try {
                if (currentPath.path === "/") {
                    try {
                        const allExt = await getAllExternalFilesDirs();
                        if (allExt.length > 1) {
                            const sdCardPaths = allExt.map(sdp =>
                                sdp.substring(0, sdp.indexOf("/Android")),
                            );
                            if (
                                (
                                    await Promise.all(
                                        sdCardPaths.map(_ => exists(_)),
                                    )
                                ).every(val => val)
                            ) {
                                setFilesData(
                                    sdCardPaths.map(_ => ({
                                        type: "folder",
                                        path: _,
                                    })),
                                );
                            }
                        } else {
                            setCurrentPath({
                                path: ExternalStorageDirectoryPath,
                                parent: null,
                            });
                            return;
                        }
                    } catch {
                        setCurrentPath({
                            path: ExternalStorageDirectoryPath,
                            parent: null,
                        });
                        return;
                    }
                } else {
                    const res = (await readDir(currentPath.path)) ?? [];
                    let folders: IFileItem[] = [];
                    let files: IFileItem[] = [];
                    if (
                        fileType === "folder" ||
                        fileType === "file-and-folder"
                    ) {
                        folders = res
                            .filter(_ => _.isDirectory())
                            .map(_ => ({
                                type: "folder",
                                path: _.path,
                            }));
                    }
                    if (fileType === "file" || fileType === "file-and-folder") {
                        files = res
                            .filter(
                                _ =>
                                    _.isFile() &&
                                    (matchExtension
                                        ? matchExtension(_.path)
                                        : true),
                            )
                            .map(_ => ({
                                type: "file",
                                path: _.path,
                            }));
                    }
                    setFilesData([...folders, ...files]);
                }
            } catch {
                setFilesData([]);
            }
            setLoading(false);
        })();
    }, [currentPath.path, fileType, matchExtension]);

    useHardwareBack(() => {
        if (actionLoading) {
            return true;
        }
        // 注意闭包
        const _currentPath = currentPathRef.current;
        if (_currentPath.parent !== null) {
            setCurrentPath(_currentPath.parent);
        } else {
            navigation.goBack();
        }
        return true;
    }, [actionLoading, navigation]);

    const selectPath = useCallback(
        (item: IFileItem | IFileItem[], nextChecked: boolean) => {
            const targetItems = Array.isArray(item) ? item : [item];
            if (multi) {
                setCheckedItems(prev => {
                    const itemPathSet = new Set(
                        targetItems.map(targetItem => targetItem.path),
                    );
                    const newCheckedItem = prev.filter(
                        checkedItem => !itemPathSet.has(checkedItem.path),
                    );
                    if (nextChecked) {
                        return [...newCheckedItem, ...targetItems];
                    } else {
                        return newCheckedItem;
                    }
                });
            } else {
                setCheckedItems(nextChecked ? targetItems : []);
            }
        },
        [multi],
    );

    const renderItem = ({ item }: { item: IFileItem }) => (
        <FileItem
            path={item.path}
            type={item.type}
            parentPath={currentPath.path}
            disabled={actionLoading || loading}
            onItemPress={currentChecked => {
                if (item.type === "folder") {
                    setCurrentPath(prev => ({
                        parent: prev,
                        path: item.path,
                    }));
                } else {
                    selectPath(item, !currentChecked);
                }
            }}
            checked={checkedPathSet.has(item.path)}
            onCheckedChange={checked => {
                selectPath(item, checked);
            }}
        />
    );

    const currentPageAllChecked = useMemo(() => {
        return (
            filesData.length > 0 &&
            filesData.every(file => checkedPathSet.has(file.path))
        );
    }, [filesData, checkedPathSet]);

    const renderHeader = () => {
        return (
            <View style={style.listHeader}>
                <View
                    style={[
                        style.locationCard,
                        {
                            backgroundColor: colors.surfacePrimary,
                            borderColor: colors.controlBorder ?? colors.divider,
                        },
                    ]}>
                    <View
                        style={[
                            style.locationIcon,
                            {
                                backgroundColor: colors.selectedBackground,
                                borderColor: colors.selectedBorder,
                            },
                        ]}>
                        <IconButton
                            sizeType="small"
                            name="folder-outline"
                            color={colors.primary}
                        />
                    </View>
                    <View style={style.locationText}>
                        <ThemeText
                            fontSize="description"
                            fontColor="textSecondary">
                            {i18n.t("fileSelector.currentLocation")}
                        </ThemeText>
                        <ThemeText
                            numberOfLines={1}
                            ellipsizeMode="head"
                            style={style.locationPath}>
                            {currentLocation}
                        </ThemeText>
                    </View>
                    {canGoParent ? (
                        <Button
                            onPress={() => {
                                if (loading || actionLoading) {
                                    return;
                                }
                                if (currentPath.parent) {
                                    setCurrentPath(currentPath.parent);
                                }
                            }}>
                            {i18n.t("fileSelector.parentFolder")}
                        </Button>
                    ) : null}
                </View>
                {multi ? (
                    <View style={style.selectAll}>
                        <Button
                            disabled={loading || actionLoading}
                            onPress={() => {
                                if (loading || actionLoading) {
                                    return;
                                }
                                if (currentPageAllChecked) {
                                    selectPath(filesData, false);
                                } else {
                                    selectPath(filesData, true);
                                }
                            }}>
                            {currentPageAllChecked
                                ? i18n.t("common.unselectAll")
                                : i18n.t("common.selectAll")}
                        </Button>
                        {checkedItems.length ? (
                            <ThemeText
                                fontSize="description"
                                fontColor="textSecondary">
                                {i18n.t("fileSelector.selectedCount", {
                                    count: checkedItems.length,
                                })}
                            </ThemeText>
                        ) : null}
                    </View>
                ) : null}
            </View>
        );
    };

    const renderEmpty = () => {
        return (
            <Empty
                icon="folder-outline"
                title={i18n.t("fileSelector.emptyTitle")}
                description={i18n.t("fileSelector.emptyDescription")}
                actionText={
                    canGoParent
                        ? i18n.t("fileSelector.parentFolder")
                        : undefined
                }
                onAction={
                    canGoParent && currentPath.parent
                        ? () => {
                            if (currentPath.parent) {
                                setCurrentPath(currentPath.parent);
                            }
                        }
                        : undefined
                }
            />
        );
    };

    const appBar = (
        <View
            style={[
                style.header,
                {
                    backgroundColor: colors.appBar,
                    borderBottomColor: colors.divider,
                },
            ]}>
            <IconButton
                sizeType="small"
                name="arrow-long-left"
                color={colors.appBarText}
                accessibilityLabel={
                    currentPath.parent !== null
                        ? i18n.t("fileSelector.parentFolder")
                        : i18n.t("a11y.back")
                }
                onPress={() => {
                    if (loading || actionLoading) {
                        return;
                    }
                    if (currentPath.parent !== null) {
                        setCurrentPath(currentPath.parent);
                    } else {
                        navigation.goBack();
                    }
                }}
            />
            <View style={style.headerTextWrapper}>
                <ThemeText
                    numberOfLines={1}
                    ellipsizeMode="head"
                    fontColor="appBarText"
                    style={style.headerPath}>
                    {currentPath.path}
                </ThemeText>
            </View>
        </View>
    );

    const bottom = (
        <Pressable
            disabled={!checkedItems.length || actionLoading}
            accessibilityRole="button"
            accessibilityLabel={actionText}
            accessibilityState={{
                busy: actionLoading,
                disabled: !checkedItems.length || actionLoading,
            }}
            onPress={async () => {
                if (!checkedItems.length || actionLoading || actionLockRef.current) {
                    return;
                }

                actionLockRef.current = true;
                setActionLoading(true);
                try {
                    const shouldBack = await onAction?.(checkedItems);
                    if (shouldBack) {
                        navigation.goBack();
                    }
                } catch (error: any) {
                    Toast.warn(
                        i18n.t("toast.unknownError", {
                            reason: error?.message ?? error,
                        }),
                    );
                } finally {
                    actionLockRef.current = false;
                    setActionLoading(false);
                }
            }}
            style={({ pressed }) => [
                style.actionBar,
                {
                    backgroundColor: colors.surfacePrimary,
                    borderTopColor: colors.controlBorder ?? colors.divider,
                    opacity:
                        actionLoading || (pressed && checkedItems.length)
                            ? 0.68
                            : 1,
                },
            ]}>
            <View
                style={[
                    style.actionButton,
                    {
                        backgroundColor: checkedItems.length
                            ? colors.primary
                            : colors.controlBackground,
                        borderColor: checkedItems.length
                            ? colors.primary
                            : colors.controlBorder ?? colors.divider,
                    },
                ]}>
                {actionLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <ThemeText
                        fontWeight="medium"
                        color={
                            checkedItems.length ? "#fff" : colors.disabledText
                        }>
                        {multi && checkedItems?.length > 0
                            ? `${actionText} (${i18n.t(
                                "fileSelector.selectedCount",
                                {
                                    count: checkedItems.length,
                                },
                            )})`
                            : actionText}
                    </ThemeText>
                )}
            </View>
        </Pressable>
    );

    return (
        <PageShell appBar={appBar} bottom={bottom} horizontalEdges={[]}>
            {loading ? (
                <SkeletonList count={8} withArtwork={false} />
            ) : (
                <>
                    <FlatList
                        ListHeaderComponent={renderHeader}
                        ListEmptyComponent={renderEmpty}
                        style={globalStyle.fwflex1}
                        contentContainerStyle={
                            filesData.length
                                ? style.listContent
                                : [style.listContent, style.emptyContent]
                        }
                        data={filesData}
                        getItemLayout={(_, index) => ({
                            length: ITEM_HEIGHT,
                            offset: ITEM_HEIGHT * index,
                            index,
                        })}
                        renderItem={renderItem}
                    />
                </>
            )}
        </PageShell>
    );
}

const style = StyleSheet.create({
    header: {
        minHeight: rpx(104),
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTextWrapper: {
        flex: 1,
        marginLeft: spacing.md,
    },
    headerPath: {
        marginTop: rpx(2),
    },
    selectAll: {
        width: "100%",
        minHeight: rpx(72),
        paddingHorizontal: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    listHeader: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    locationCard: {
        minHeight: rpx(104),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
    },
    locationIcon: {
        width: rpx(64),
        height: rpx(64),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.md,
    },
    locationText: {
        flex: 1,
        minWidth: 0,
        marginRight: spacing.sm,
    },
    locationPath: {
        marginTop: spacing.xs,
    },
    listContent: {
        paddingBottom: spacing.md,
    },
    emptyContent: {
        flexGrow: 1,
    },
    actionBar: {
        width: "100%",
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    actionButton: {
        width: "100%",
        minHeight: rpx(84),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
});
