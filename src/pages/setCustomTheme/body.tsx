import Image from "@/components/base/image";
import ThemeText from "@/components/base/themeText";
import { showPanel } from "@/components/panels/usePanel";
import { ImgAsset } from "@/constants/assetsConst";
import globalStyle from "@/constants/globalStyle";
import pathConst from "@/constants/pathConst";
import { useI18N } from "@/core/i18n";
import Theme from "@/core/theme";
import useColors, { CustomizedColors } from "@/hooks/useColors";
import { grayRate } from "@/utils/colorUtil";
import rpx from "@/utils/rpx";
import Slider from "@react-native-community/slider";
import Color from "color";
import { ResizeMode, Video } from "expo-av";
import React from "react";
import { StyleSheet, View } from "react-native";
import { copyFile } from "react-native-fs";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import ImageColors from "react-native-image-colors";
import { launchImageLibrary } from "react-native-image-picker";
import Icon from "@/components/base/icon";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { errorLog } from "@/utils/log";
import { getMediaExtension, isVideoBackgroundUrl } from "@/utils/backgroundMedia";

export default function Body() {
    const theme = Theme.useTheme();
    const backgroundInfo = Theme.useBackground();
    const { t } = useI18N();
    const colors = useColors();
    const hasBackground = !!backgroundInfo?.url;
    const hasVideoBackground = isVideoBackgroundUrl(backgroundInfo?.url);
    const primaryTextColor = readableOn(theme.colors.primary);

    async function onImageClick() {
        try {
            const result = await launchImageLibrary({
                mediaType: "mixed",
            });
            const asset = result.assets?.[0];
            const uri = asset?.uri;
            if (!uri) {
                return;
            }

            const isVideo = asset.type?.startsWith("video/") ||
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
            if (isVideo) {
                themeColors = theme.colors;
            } else {
                try {
                    const colorsResult = await ImageColors.getColors(
                        backgroundUrl,
                        { fallback: theme.colors.primary },
                    );
                    const extractedPrimary =
                        (colorsResult as any).dominant ??
                        (colorsResult as any).average ??
                        (colorsResult as any).vibrant;

                    if (extractedPrimary) {
                        const primaryGrayRate = grayRate(extractedPrimary);
                        const primaryColor = Color(extractedPrimary);
                        const adjustedPrimary = primaryGrayRate < -0.4 ||
                            primaryGrayRate > 0.4
                            ? primaryColor
                                .darken(primaryGrayRate * 5)
                                .toString()
                            : primaryColor
                                .saturate(Math.abs(primaryGrayRate) * 2 + 2)
                                .toString();

                        themeColors = {
                            appBar: extractedPrimary,
                            primary: adjustedPrimary,
                            musicBar: extractedPrimary,
                            card: "#1e1e1e",
                            ...(primaryGrayRate < -0.4
                                ? { tabBar: primaryColor.alpha(0.2).toString() }
                                : {}),
                        };
                    }
                } catch (e: any) {
                    errorLog("提取自定义背景配色失败", e?.message ?? e);
                }
            }

            Theme.setTheme("custom", {
                colors: themeColors,
                background: {
                    url: backgroundUrl,
                },
            });
            // Config.set('setting.theme.colors', {
            //     primary: primaryColor,
            //     textHighlight: textHighlight,
            //     accent: textHighlight,
            // });
        } catch (e: any) {
            errorLog("设置自定义背景失败", e?.message ?? e);
        }
    }

    return (
        <ScrollView
            style={globalStyle.fwflex1}
            contentContainerStyle={styles.content}>
            <View
                style={[
                    styles.previewPanel,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.controlBorder ?? colors.divider,
                    },
                ]}>
                <TouchableOpacity onPress={onImageClick}>
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
                        activeOpacity={0.78}
                        onPress={onImageClick}
                        style={[
                            styles.backgroundActionPrimary,
                            { backgroundColor: theme.colors.primary },
                        ]}>
                        <Icon
                            name="arrow-up-tray"
                            size={rpx(26)}
                            color={primaryTextColor}
                        />
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
                            activeOpacity={0.72}
                            onPress={Theme.clearBackground}
                            style={[
                                styles.backgroundActionSecondary,
                                {
                                    backgroundColor: colors.controlBackground,
                                    borderColor: colors.controlBorder ?? colors.divider,
                                },
                            ]}>
                            <Icon
                                name="trash-outline"
                                size={rpx(26)}
                                color={theme.colors.danger ?? theme.colors.text}
                            />
                            <ThemeText
                                fontSize="description"
                                fontWeight="semibold"
                                color={theme.colors.danger ?? theme.colors.text}>
                                {t("setCustomTheme.clearBackground")}
                            </ThemeText>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            <View
                style={[
                    styles.sliderWrapper,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.controlBorder ?? colors.divider,
                    },
                ]}>
                <ThemeText>{t("setCustomTheme.blur")}</ThemeText>
                <Slider
                    style={styles.slider}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.text ?? "#999999"}
                    thumbTintColor={theme.colors.primary}
                    minimumValue={0}
                    step={1}
                    maximumValue={30}
                    onSlidingComplete={val => {
                        Theme.setBackground({
                            blur: val,
                        });
                    }}
                    value={backgroundInfo?.blur ?? 20}
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
                <ThemeText>{t("setCustomTheme.opacity")}</ThemeText>
                <Slider
                    style={styles.slider}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.text ?? "#999999"}
                    thumbTintColor={theme.colors.primary}
                    minimumValue={0.3}
                    step={0.01}
                    maximumValue={1}
                    onSlidingComplete={val => {
                        Theme.setBackground({
                            opacity: val,
                        });
                    }}
                    value={backgroundInfo?.opacity ?? 0.7}
                />
            </View>
            <View style={styles.colorsContainer}>
                {Theme.configableColorKey.map(key => (
                    <View
                        key={key}
                        style={[
                            styles.colorItem,
                            {
                                backgroundColor: colors.surfacePrimary,
                                borderColor: colors.controlBorder ?? colors.divider,
                            },
                        ]}>
                        <ThemeText>{t("setCustomTheme." + key + "Color" as any)}</ThemeText>
                        <TouchableOpacity
                            onPress={() => {
                                showPanel("ColorPicker", {
                                    // @ts-ignore
                                    defaultColor: theme.colors[key],
                                    onSelected(color) {
                                        Theme.setColors({
                                            [key]: color.hexa().toString(),
                                        });
                                    },
                                });
                            }}
                            style={styles.colorItemBlockContainer}>
                            <View
                                style={[
                                    styles.colorBlockContainer,
                                    { borderColor: colors.controlBorder ?? colors.divider },
                                ]}>
                                <Image
                                    resizeMode="repeat"
                                    emptySrc={ImgAsset.transparentBg}
                                    style={styles.transparentBg}
                                />
                                <View
                                    style={[
                                        {
                                            /** @ts-ignore */
                                            backgroundColor: theme.colors[key],
                                        },
                                        styles.colorBlock,
                                    ]}
                                />
                            </View>
                            <ThemeText
                                fontSize="subTitle"
                                style={styles.colorText}>
                                {
                                    /** @ts-ignore */
                                    Color(theme.colors[key]).hexa().toString()
                                }
                            </ThemeText>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

function readableOn(color: string) {
    try {
        const base = Color(color);
        const light = Color("#ffffff");
        const dark = Color("#111111");
        return base.contrast(light) >= base.contrast(dark) ? "#ffffff" : "#111111";
    } catch {
        return "#ffffff";
    }
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
    container: {
        width: "100%",
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.xxl,
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
        minHeight: rpx(56),
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
    },
    backgroundActionSecondary: {
        minHeight: rpx(56),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
    },
    sliderWrapper: {
        marginTop: spacing.md,
        width: "100%",
        minHeight: rpx(88),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    slider: {
        flex: 1,
        height: rpx(40),
    },
    colorsContainer: {
        width: "100%",
        flex: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: spacing.md,
        justifyContent: "space-between",
        gap: spacing.md,
    },
    colorItem: {
        flex: 1,
        flexBasis: "40%",
        minWidth: rpx(300),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.md,
    },
    colorBlockContainer: {
        width: rpx(76),
        height: rpx(50),
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
    colorItemBlockContainer: {
        marginTop: rpx(18),
        flexDirection: "row",
        alignItems: "center",
    },
    colorText: {
        marginLeft: rpx(8),
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
