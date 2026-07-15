import Image from "@/components/base/image";
import ThemePreview from "@/components/base/themePreview";
import ThemeText from "@/components/base/themeText";
import { showPanel } from "@/components/panels/usePanel";
import { ImgAsset } from "@/constants/assetsConst";
import globalStyle from "@/constants/globalStyle";
import pathConst from "@/constants/pathConst";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import { useI18N } from "@/core/i18n";
import Theme from "@/core/theme";
import { getReadableTextColor } from "@/core/colorSafety";
import useColors, { CustomizedColors } from "@/hooks/useColors";
import { errorLog } from "@/utils/log";
import rpx from "@/utils/rpx";
import {
    getMediaExtension,
    isVideoBackgroundUrl,
} from "@/utils/backgroundMedia";
import Slider from "@react-native-community/slider";
import Color from "color";
import { ResizeMode, Video } from "expo-av";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { copyFile } from "react-native-fs";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import ImageColors from "react-native-image-colors";
import { launchImageLibrary } from "react-native-image-picker";

interface IBackgroundSnapshot {
    url?: string;
    blur?: number;
    opacity?: number;
}

function getThemeColor(
    colors: CustomizedColors,
    key: keyof CustomizedColors,
) {
    const value = colors[key];
    if (typeof value !== "string") {
        return "#000000";
    }
    try {
        Color(value);
        return value;
    } catch {
        return "#000000";
    }
}

export default function Body() {
    const theme = Theme.useTheme();
    const backgroundInfo = Theme.useBackground();
    const { t } = useI18N();
    const colors = useColors();
    const hasBackground = !!backgroundInfo?.url;
    const hasVideoBackground = isVideoBackgroundUrl(backgroundInfo?.url);
    const [blur, setBlur] = useState(backgroundInfo?.blur ?? 20);
    const [opacity, setOpacity] = useState(backgroundInfo?.opacity ?? 0.7);
    const [lastClearedBackground, setLastClearedBackground] =
        useState<IBackgroundSnapshot | null>(null);
    const [backgroundError, setBackgroundError] = useState(false);
    const primaryTextColor = getReadableTextColor(theme.colors.primary);

    useEffect(() => {
        setBlur(backgroundInfo?.blur ?? 20);
    }, [backgroundInfo?.blur]);

    useEffect(() => {
        setOpacity(backgroundInfo?.opacity ?? 0.7);
    }, [backgroundInfo?.opacity]);

    async function onImageClick() {
        try {
            setBackgroundError(false);
            const result = await launchImageLibrary({ mediaType: "mixed" });
            const asset = result.assets?.[0];
            const uri = asset?.uri;
            if (!uri) {
                return;
            }

            const isVideo =
                asset.type?.startsWith("video/") ||
                isVideoBackgroundUrl(asset.fileName) ||
                isVideoBackgroundUrl(uri);
            const extension = getPickedAssetExtension({
                fileName: asset.fileName,
                uri,
                type: asset.type,
                isVideo,
            });
            const bgPath = `${pathConst.dataPath}background${extension}`;
            await copyFile(uri, bgPath);
            const backgroundUrl = `file://${bgPath}#${Date.now()}`;

            let themeColors: Partial<CustomizedColors> = theme.colors;
            if (!isVideo) {
                try {
                    const colorsResult = await ImageColors.getColors(
                        backgroundUrl,
                        { fallback: theme.colors.primary },
                    );
                    const extractedPrimary =
                        (colorsResult as any).dominant ??
                        (colorsResult as any).average ??
                        (colorsResult as any).vibrant;

                    if (typeof extractedPrimary === "string") {
                        const mode = Color(extractedPrimary).isDark()
                            ? "dark"
                            : "light";
                        themeColors = Theme.createCustomThemeColors(
                            extractedPrimary,
                            mode,
                        );
                    }
                } catch (e: any) {
                    errorLog("提取自定义背景配色失败", e?.message ?? e);
                }
            }

            Theme.setTheme("custom", {
                colors: themeColors,
                background: { url: backgroundUrl },
            });
            setLastClearedBackground(null);
        } catch (e: any) {
            setBackgroundError(true);
            errorLog("设置自定义背景失败", e?.message ?? e);
        }
    }

    function clearCurrentBackground() {
        if (backgroundInfo?.url) {
            setLastClearedBackground({ ...backgroundInfo });
        }
        Theme.clearBackground();
    }

    function restoreBackground() {
        if (!lastClearedBackground?.url) {
            return;
        }
        Theme.setBackground(lastClearedBackground);
        setLastClearedBackground(null);
    }

    return (
        <ScrollView
            style={globalStyle.fwflex1}
            contentContainerStyle={styles.content}>
            <View
                style={[
                    styles.saveHint,
                    {
                        backgroundColor: colors.selectedBackground,
                        borderColor: colors.selectedBorder,
                    },
                ]}>
                <ThemeText fontSize="description" fontColor="text">
                    {t("setCustomTheme.autoSaveHint")}
                </ThemeText>
            </View>

            <View
                style={[
                    styles.previewPanel,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.controlBorder ?? colors.divider,
                    },
                ]}>
                <TouchableOpacity
                    accessibilityLabel={
                        hasBackground
                            ? t("setCustomTheme.changeBackground")
                            : t("setCustomTheme.chooseBackground")
                    }
                    accessibilityRole="button"
                    onPress={onImageClick}>
                    {hasVideoBackground && backgroundInfo?.url ? (
                        <Video
                            source={{ uri: backgroundInfo.url }}
                            style={styles.image}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay
                            isLooping
                            isMuted
                            useNativeControls={false}
                            volume={0}
                        />
                    ) : (
                        <Image
                            style={styles.image}
                            uri={backgroundInfo?.url}
                            emptySrc={ImgAsset.addBackground}
                        />
                    )}
                </TouchableOpacity>

                <View style={styles.backgroundActions}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.78}
                        onPress={onImageClick}
                        style={[
                            styles.backgroundActionPrimary,
                            { backgroundColor: theme.colors.primary },
                        ]}>
                        <ThemeText
                            fontSize="description"
                            fontWeight="semibold"
                            color={primaryTextColor}>
                            {hasBackground
                                ? t("setCustomTheme.changeBackground")
                                : t("setCustomTheme.chooseBackground")}
                        </ThemeText>
                    </TouchableOpacity>
                    {hasBackground ? (
                        <TouchableOpacity
                            accessibilityRole="button"
                            activeOpacity={0.72}
                            onPress={clearCurrentBackground}
                            style={[
                                styles.backgroundActionSecondary,
                                {
                                    backgroundColor: colors.controlBackground,
                                    borderColor:
                                        colors.controlBorder ?? colors.divider,
                                },
                            ]}>
                            <ThemeText
                                fontSize="description"
                                fontWeight="semibold"
                                color={theme.colors.danger ?? theme.colors.text}>
                                {t("setCustomTheme.clearBackground")}
                            </ThemeText>
                        </TouchableOpacity>
                    ) : null}
                    {lastClearedBackground?.url ? (
                        <TouchableOpacity
                            accessibilityRole="button"
                            activeOpacity={0.72}
                            onPress={restoreBackground}
                            style={[
                                styles.backgroundActionSecondary,
                                {
                                    backgroundColor: colors.controlBackground,
                                    borderColor:
                                        colors.controlBorder ?? colors.divider,
                                },
                            ]}>
                            <ThemeText
                                fontSize="description"
                                fontWeight="semibold"
                                fontColor="text">
                                {t("setCustomTheme.restoreBackground")}
                            </ThemeText>
                        </TouchableOpacity>
                    ) : null}
                </View>
                {backgroundError ? (
                    <ThemeText
                        fontSize="description"
                        fontColor="danger"
                        style={styles.errorText}>
                        {t("setCustomTheme.backgroundError")}
                    </ThemeText>
                ) : null}
            </View>

            <View
                style={[
                    styles.livePreviewPanel,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.controlBorder ?? colors.divider,
                    },
                ]}>
                <View style={styles.previewHeader}>
                    <View style={styles.previewCopy}>
                        <ThemeText fontSize="subTitle" fontWeight="semibold">
                            {t("setCustomTheme.preview")}
                        </ThemeText>
                        <ThemeText fontSize="description" fontColor="textSecondary">
                            {t("setCustomTheme.readabilityProtected")}
                        </ThemeText>
                    </View>
                    <TouchableOpacity
                        accessibilityRole="button"
                        onPress={Theme.resetCustomColors}
                        style={[
                            styles.resetButton,
                            {
                                backgroundColor: colors.controlBackground,
                                borderColor:
                                    colors.controlBorder ?? colors.divider,
                            },
                        ]}>
                        <ThemeText fontSize="description" fontWeight="semibold">
                            {t("setCustomTheme.resetColors")}
                        </ThemeText>
                    </TouchableOpacity>
                </View>
                <ThemePreview
                    colors={theme.colors}
                    effect={
                        theme.id === "p-acg-firefly" ? "firefly" : undefined
                    }
                    style={styles.livePreview}
                />
            </View>

            <View
                style={[
                    styles.sliderWrapper,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.controlBorder ?? colors.divider,
                    },
                ]}>
                <View style={styles.sliderHeader}>
                    <ThemeText>{t("setCustomTheme.blur")}</ThemeText>
                    <ThemeText fontSize="description" fontColor="textSecondary">
                        {Math.round(blur)}
                    </ThemeText>
                </View>
                <Slider
                    accessibilityLabel={t("setCustomTheme.blur")}
                    style={styles.slider}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.text ?? "#999999"}
                    thumbTintColor={theme.colors.primary}
                    minimumValue={0}
                    step={1}
                    maximumValue={30}
                    onValueChange={setBlur}
                    onSlidingComplete={val => {
                        setBlur(val);
                        Theme.setBackground({ blur: val });
                    }}
                    value={blur}
                />
            </View>
            <View
                style={[
                    styles.sliderWrapper,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.controlBorder ?? colors.divider,
                    },
                ]}>
                <View style={styles.sliderHeader}>
                    <ThemeText>{t("setCustomTheme.opacity")}</ThemeText>
                    <ThemeText fontSize="description" fontColor="textSecondary">
                        {`${Math.round(opacity * 100)}%`}
                    </ThemeText>
                </View>
                <Slider
                    accessibilityLabel={t("setCustomTheme.opacity")}
                    style={styles.slider}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.text ?? "#999999"}
                    thumbTintColor={theme.colors.primary}
                    minimumValue={0.3}
                    step={0.01}
                    maximumValue={1}
                    onValueChange={setOpacity}
                    onSlidingComplete={val => {
                        setOpacity(val);
                        Theme.setBackground({ opacity: val });
                    }}
                    value={opacity}
                />
            </View>

            {Theme.configurableColorGroups.map(group => (
                <View key={group.id} style={styles.colorGroup}>
                    <ThemeText fontSize="subTitle" fontWeight="semibold">
                        {t(`setCustomTheme.group${
                            group.id.charAt(0).toUpperCase() + group.id.slice(1)
                        }` as any)}
                    </ThemeText>
                    <View style={styles.colorsContainer}>
                        {group.keys.map(key => {
                            const colorValue = getThemeColor(theme.colors, key);
                            return (
                                <TouchableOpacity
                                    key={key}
                                    accessibilityLabel={t(
                                        "setCustomTheme." + key + "Color" as any,
                                    )}
                                    accessibilityRole="button"
                                    onPress={() => {
                                        showPanel("ColorPicker", {
                                            defaultColor: colorValue,
                                            onSelected(color) {
                                                Theme.setColors({
                                                    [key]: color.hexa().toString(),
                                                } as Partial<CustomizedColors>);
                                            },
                                        });
                                    }}
                                    style={[
                                        styles.colorItem,
                                        {
                                            backgroundColor: colors.surfacePrimary,
                                            borderColor:
                                                colors.controlBorder ??
                                                colors.divider,
                                        },
                                    ]}>
                                    <ThemeText>
                                        {t(
                                            "setCustomTheme." +
                                                key +
                                                "Color" as any,
                                        )}
                                    </ThemeText>
                                    <View style={styles.colorItemFooter}>
                                        <View
                                            style={[
                                                styles.colorBlockContainer,
                                                {
                                                    borderColor:
                                                        colors.controlBorder ??
                                                        colors.divider,
                                                },
                                            ]}>
                                            <Image
                                                resizeMode="repeat"
                                                emptySrc={ImgAsset.transparentBg}
                                                style={styles.transparentBg}
                                            />
                                            <View
                                                style={[
                                                    styles.colorBlock,
                                                    {
                                                        backgroundColor: colorValue,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <ThemeText
                                            fontSize="subTitle"
                                            numberOfLines={1}
                                            style={styles.colorText}>
                                            {Color(colorValue).hexa().toString()}
                                        </ThemeText>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

function getPickedAssetExtension(asset: {
    fileName?: string;
    uri: string;
    type?: string;
    isVideo: boolean;
}) {
    const fromFileName = getMediaExtension(asset.fileName);
    if (fromFileName) {
        return `.${fromFileName}`;
    }

    const fromUri = getMediaExtension(asset.uri);
    if (fromUri) {
        return `.${fromUri}`;
    }

    const fromMime = asset.type?.split("/")[1]?.toLowerCase();
    if (fromMime) {
        return `.${fromMime === "jpeg" ? "jpg" : fromMime}`;
    }

    return asset.isVideo ? ".mp4" : ".jpg";
}

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.xxl,
    },
    saveHint: {
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
    },
    previewPanel: {
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        alignItems: "center",
    },
    image: {
        borderRadius: radius.lg,
        width: rpx(460),
        height: rpx(690),
        alignSelf: "center",
    },
    backgroundActions: {
        marginTop: spacing.md,
        flexDirection: "row",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: spacing.sm,
    },
    backgroundActionPrimary: {
        minHeight: 48,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    backgroundActionSecondary: {
        minHeight: 48,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    errorText: {
        marginTop: spacing.sm,
        alignSelf: "stretch",
    },
    livePreviewPanel: {
        marginTop: spacing.md,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.md,
    },
    previewHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.sm,
    },
    previewCopy: {
        flex: 1,
        minWidth: 0,
        paddingRight: spacing.sm,
    },
    resetButton: {
        minHeight: 48,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: "center",
    },
    livePreview: {
        aspectRatio: 1.58,
    },
    sliderWrapper: {
        marginTop: spacing.md,
        width: "100%",
        minHeight: 80,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        justifyContent: "center",
    },
    sliderHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    slider: {
        width: "100%",
        height: 40,
        marginTop: spacing.xs,
    },
    colorGroup: {
        marginTop: spacing.lg,
    },
    colorsContainer: {
        width: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: spacing.sm,
        gap: spacing.md,
    },
    colorItem: {
        flexGrow: 1,
        flexBasis: "42%",
        minWidth: rpx(300),
        minHeight: 96,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.md,
        justifyContent: "space-between",
    },
    colorItemFooter: {
        marginTop: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        minHeight: 48,
    },
    colorBlockContainer: {
        width: 48,
        height: 36,
        borderWidth: StyleSheet.hairlineWidth,
        borderStyle: "solid",
        borderRadius: radius.sm,
        overflow: "hidden",
    },
    colorBlock: {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 2,
    },
    colorText: {
        flex: 1,
        minWidth: 0,
        marginLeft: spacing.sm,
    },
    transparentBg: {
        position: "absolute",
        zIndex: -1,
        width: "100%",
        height: "100%",
        left: 0,
        top: 0,
    },
});
