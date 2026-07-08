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
import { ImgAsset } from "@/constants/assetsConst";
import { isVideoBackgroundUrl } from "@/utils/backgroundMedia";

const DEFAULT_BACKGROUND_BLUR = 20;
const DEFAULT_BACKGROUND_OPACITY = 0.6;
const FIREFLY_BACKGROUND_BLUR = 4;
const FIREFLY_BACKGROUND_OPACITY = 0.8;

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
    const customBackgroundUrl = fireflyBackground ? undefined : background.url;
    const customBackgroundIsVideo = isVideoBackgroundUrl(customBackgroundUrl);
    const customBackgroundImageUrl = customBackgroundIsVideo
        ? undefined
        : customBackgroundUrl;
    const customBackgroundVideoUrl = customBackgroundIsVideo
        ? customBackgroundUrl
        : undefined;
    const hasBackgroundImage = !!customBackgroundImageUrl || !!fireflyBackground;
    const hasBackgroundVideo = !!customBackgroundVideoUrl;

    let baseBackgroundColor = colors.pageBackground ?? colors.background;
    if (hasBackgroundImage || hasBackgroundVideo) {
        try {
            const c = Color(baseBackgroundColor);
            if (c.alpha() < 1) {
                baseBackgroundColor = c.alpha(1).rgb().string();
            }
        } catch {}
    }

    return {
        baseBackgroundColor,
        customBackgroundUrl: customBackgroundImageUrl,
        customBackgroundVideoUrl,
        fireflyBackground,
        hasBackgroundImage,
        hasBackgroundVideo,
        isFireflyBackground: !!fireflyBackground,
        mediaOpacity: customBackgroundUrl
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

    const hasMedia = background.hasBackgroundImage || background.hasBackgroundVideo;
    if (!withBase && (!withImage || !hasMedia)) {
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
                            opacity: background.mediaOpacity,
                        },
                    ]}
                    blurRadius={background.imageBlurRadius}
                />
            ) : null}
            {withImage && background.hasBackgroundVideo ? (
                <Video
                    pointerEvents="none"
                    source={{ uri: background.customBackgroundVideoUrl! }}
                    style={[
                        styles.wrapper,
                        style,
                        { opacity: background.mediaOpacity },
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
});
