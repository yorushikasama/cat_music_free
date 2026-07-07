import React, { memo } from "react";
import {
    ImageStyle,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import Color from "color";
import { ResizeMode, Video } from "expo-av";
import Image from "./image";
import useColors from "@/hooks/useColors";
import Theme from "@/core/theme";
import { ImgAsset, VideoAsset } from "@/constants/assetsConst";

const DEFAULT_BACKGROUND_BLUR = 20;
const DEFAULT_BACKGROUND_OPACITY = 0.6;
const FIREFLY_BACKGROUND_BLUR = 4;
const FIREFLY_BACKGROUND_OPACITY = 0.8;
const FIREFLY_VIDEO_OPACITY = 0.72;

interface IThemedBackgroundLayerProps {
    style?: StyleProp<ViewStyle>;
    withBase?: boolean;
    withImage?: boolean;
    withFireflyScrim?: boolean;
}

export function useResolvedThemedBackground() {
    const background = Theme.useBackground() ?? {};
    const theme = Theme.useTheme();
    const colors = useColors();
    const fireflyBackground =
        theme.id === "p-acg-firefly"
            ? ImgAsset.fireflyThemeBackground
            : undefined;
    const fireflyVideo =
        theme.id === "p-acg-firefly"
            ? VideoAsset.fireflyThemeBackground
            : undefined;
    const customBackgroundUrl = fireflyBackground ? undefined : background.url;
    const hasBackgroundImage = !!customBackgroundUrl || !!fireflyBackground;
    const hasBackgroundVideo = !!fireflyVideo;

    let baseBackgroundColor = colors?.pageBackground ?? colors.background;
    if (hasBackgroundImage) {
        try {
            const c = Color(baseBackgroundColor);
            if (c.alpha() < 1) {
                baseBackgroundColor = c.alpha(1).rgb().string();
            }
        } catch {}
    }

    return {
        baseBackgroundColor,
        customBackgroundUrl,
        fireflyBackground,
        fireflyVideo,
        hasBackgroundImage,
        hasBackgroundVideo,
        isFireflyBackground: !!fireflyBackground,
        imageOpacity: customBackgroundUrl
            ? background.opacity ?? DEFAULT_BACKGROUND_OPACITY
            : FIREFLY_BACKGROUND_OPACITY,
        imageBlurRadius: customBackgroundUrl
            ? background.blur ?? DEFAULT_BACKGROUND_BLUR
            : FIREFLY_BACKGROUND_BLUR,
    };
}

function ThemedBackgroundLayer(props: IThemedBackgroundLayerProps) {
    const {
        style,
        withBase = true,
        withImage = true,
        withFireflyScrim = true,
    } = props;
    const background = useResolvedThemedBackground();

    if (!withBase && (!withImage || !background.hasBackgroundImage)) {
        return null;
    }

    return (
        <>
            {withBase ? (
                <View
                    pointerEvents="none"
                    style={[
                        styles.wrapper,
                        style,
                        {
                            backgroundColor: background.baseBackgroundColor,
                        },
                    ]}
                />
            ) : null}
            {withImage && background.hasBackgroundImage ? (
                <Image
                    accessible={false}
                    uri={background.customBackgroundUrl}
                    emptySrc={background.fireflyBackground}
                    resizeMode="cover"
                    style={[
                        styles.wrapper,
                        style as StyleProp<ImageStyle>,
                        {
                            opacity: background.imageOpacity,
                        },
                    ]}
                    blurRadius={background.imageBlurRadius}
                />
            ) : null}
            {withImage && background.hasBackgroundVideo ? (
                <Video
                    pointerEvents="none"
                    source={background.fireflyVideo}
                    style={[
                        styles.wrapper,
                        style,
                        { opacity: FIREFLY_VIDEO_OPACITY },
                    ]}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted
                    useNativeControls={false}
                    volume={0}
                />
            ) : null}
            {withFireflyScrim && background.isFireflyBackground ? (
                <View
                    pointerEvents="none"
                    style={[
                        styles.wrapper,
                        style,
                        styles.fireflyScrim,
                        background.hasBackgroundVideo ? styles.fireflyVideoScrim : null,
                    ]}
                />
            ) : null}
        </>
    );
}

export default memo(ThemedBackgroundLayer);

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
    },
    fireflyScrim: {
        backgroundColor: "rgba(236,248,235,0.14)",
    },
    fireflyVideoScrim: {
        backgroundColor: `rgba(236,248,235,${1 - FIREFLY_VIDEO_OPACITY})`,
    },
});
