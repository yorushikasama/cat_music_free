import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";

import { ImgAsset } from "@/constants/assetsConst";
import { useCurrentMusic } from "@/core/trackPlayer";
import AcgDecoration from "@/components/base/acgDecoration";
import useColors from "@/hooks/useColors";

export default function Background() {
    const musicItem = useCurrentMusic();
    const colors = useColors();

    const artworkSource = useMemo(() => {
        if (!musicItem?.artwork) {
            return ImgAsset.albumDefault;
        }

        if (typeof musicItem.artwork === "string") {
            return {
                uri: musicItem.artwork,
            };
        }
        return musicItem.artwork;
    }, [musicItem?.artwork]);

    const gradientColors = colors.detailGradientColors ?? ["rgba(0,0,0,0.1)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.7)"];
    const bgColor = colors.detailBgColor ?? colors.pageBackground ?? "#000";
    const blurRadius = colors.detailBlurRadius ?? 50;
    const blurOpacity = colors.detailBlurOpacity ?? 0.5;

    return (
        <>
            <View style={[style.background, { backgroundColor: bgColor }]} />

            <Image
                style={[style.blur, { opacity: blurOpacity }]}
                blurRadius={blurRadius}
                source={artworkSource}
            />

            <LinearGradient
                style={style.gradientOverlay}
                colors={gradientColors}
                locations={[0, 0.5, 1]}
            />

            {colors.detailVignetteColor && (
                <View style={[style.vignette, { backgroundColor: colors.detailVignetteColor }]} />
            )}

            {colors.detailGrainColor && (
                <View style={[style.grain, { backgroundColor: colors.detailGrainColor }]} />
            )}

            <AcgDecoration />
        </>
    );
}

const style = StyleSheet.create({
    background: {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    blur: {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    gradientOverlay: {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    vignette: {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    grain: {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.03,
    },
});
