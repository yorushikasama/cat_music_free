import Image from "@/components/base/image";
import ThemeText from "@/components/base/themeText";
import { showPanel } from "@/components/panels/usePanel";
import { ImgAsset } from "@/constants/assetsConst";
import globalStyle from "@/constants/globalStyle";
import pathConst from "@/constants/pathConst";
import { useI18N } from "@/core/i18n";
import Theme from "@/core/theme";
import { CustomizedColors } from "@/hooks/useColors";
import { grayRate } from "@/utils/colorUtil";
import rpx from "@/utils/rpx";
import Slider from "@react-native-community/slider";
import Color from "color";
import React from "react";
import { StyleSheet, View } from "react-native";
import { copyFile } from "react-native-fs";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import ImageColors from "react-native-image-colors";
import { launchImageLibrary } from "react-native-image-picker";
import Icon from "@/components/base/icon";

export default function Body() {
    const theme = Theme.useTheme();
    const backgroundInfo = Theme.useBackground();
    const { t } = useI18N();
    const hasBackground = !!backgroundInfo?.url;
    const primaryTextColor = readableOn(theme.colors.primary);

    async function onImageClick() {
        try {
            const result = await launchImageLibrary({
                mediaType: "photo",
            });
            const uri = result.assets?.[0].uri;
            if (!uri) {
                return;
            }

            const bgPath = `${pathConst.dataPath}background${uri.substring(
                uri.lastIndexOf("."),
            )}`;
            await copyFile(uri, bgPath);

            const colorsResult = await ImageColors.getColors(uri, {
                fallback: "#ffffff",
            });
            const colors = {
                primary: (colorsResult as any).dominant,
                average: (colorsResult as any).average,
                vibrant: (colorsResult as any).vibrant,
            };

            const primaryGrayRate = grayRate(colors.primary!);

            let themeColors: Partial<CustomizedColors>;
            if (primaryGrayRate < -0.4) {
                const primaryColor = Color(colors.primary!);

                console.log(
                    colors.primary,
                    primaryGrayRate,
                    primaryColor
                        .whiten(3 * primaryGrayRate)
                        .hex()
                        .toString(),
                );
                themeColors = {
                    appBar: colors.primary,
                    primary: primaryColor
                        .darken(primaryGrayRate * 5)
                        .toString(),
                    musicBar: colors.primary,
                    card: "#1e1e1e",
                    tabBar: primaryColor.alpha(0.2).toString(),
                };
            } else if (primaryGrayRate > 0.4) {
                themeColors = {
                    appBar: colors.primary,
                    primary: Color(colors.primary)
                        .darken(primaryGrayRate * 5)
                        .toString(),
                    musicBar: colors.primary,
                    card: "#1e1e1e",
                };
            } else {
                themeColors = {
                    appBar: colors.primary,
                    primary: Color(colors.primary)
                        .saturate(Math.abs(primaryGrayRate) * 2 + 2)
                        .toString(),
                    musicBar: colors.primary,
                    card: "#1e1e1e",
                };
            }

            Theme.setTheme("custom", {
                colors: themeColors,
                background: {
                    url: `file://${bgPath}#${Date.now()}`,
                },
            });
            // Config.set('setting.theme.colors', {
            //     primary: primaryColor,
            //     textHighlight: textHighlight,
            //     accent: textHighlight,
            // });
        } catch (e) {
            console.log(e);
        }
    }

    return (
        <ScrollView style={globalStyle.fwflex1}>
            <TouchableOpacity onPress={onImageClick}>
                <Image
                    style={styles.image}
                    uri={backgroundInfo?.url}
                    emptySrc={ImgAsset.addBackground}
                />
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
                            { borderColor: theme.colors.divider },
                        ]}>
                        <Icon
                            name="trash-outline"
                            size={rpx(26)}
                            color={theme.colors.danger ?? theme.colors.text}
                        />
                        <ThemeText
                            fontSize="description"
                            fontWeight="semibold"
                            style={{ color: theme.colors.danger ?? theme.colors.text }}>
                            {t("setCustomTheme.clearBackground")}
                        </ThemeText>
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={styles.sliderWrapper}>
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
            <View style={styles.sliderWrapper}>
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
                    <View key={key} style={styles.colorItem}>
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
                            <View style={[styles.colorBlockContainer]}>
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

const styles = StyleSheet.create({
    container: {
        width: "100%",
        flex: 1,
    },
    image: {
        marginTop: rpx(36),
        borderRadius: rpx(12),
        width: rpx(460),
        height: rpx(690),
        alignSelf: "center",
    },
    backgroundActions: {
        marginTop: rpx(24),
        paddingHorizontal: rpx(24),
        flexDirection: "row",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: rpx(18),
    },
    backgroundActionPrimary: {
        minHeight: rpx(56),
        borderRadius: rpx(999),
        paddingHorizontal: rpx(26),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: rpx(10),
    },
    backgroundActionSecondary: {
        minHeight: rpx(56),
        borderRadius: rpx(999),
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: rpx(26),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: rpx(10),
    },
    sliderWrapper: {
        marginTop: rpx(48),
        width: "100%",
        paddingHorizontal: rpx(24),
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
        marginTop: rpx(48),
        paddingHorizontal: rpx(24),
        justifyContent: "space-between",
    },
    colorItem: {
        flex: 1,
        flexBasis: "40%",
        marginBottom: rpx(36),
    },
    colorBlockContainer: {
        width: rpx(76),
        height: rpx(50),
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#ccc",
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
