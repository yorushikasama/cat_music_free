import React, { memo } from "react";
import { StyleSheet, Text } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import { fontSizeConst } from "@/constants/uiConst";
import Theme from "@/core/theme";

interface ILyricItemComponentProps {
    index?: number;
    light?: boolean;
    highlight?: boolean;
    text?: string;
    fontSize?: number;
    onLayout?: (index: number, height: number) => void;
}

function _LyricItemComponent(props: ILyricItemComponentProps) {
    const { light, highlight, text, onLayout, index, fontSize } = props;

    const colors = useColors();
    const theme = Theme.useTheme();
    const isRetro = theme.id === "p-retro";
    const isAcg = theme.id.startsWith("p-acg");
    const isSpotify = theme.id === "p-spotify";

    const baseFontSize = fontSize || fontSizeConst.content;

    const getBaseStyle = () => {
        if (isSpotify) {
            return { color: "#b3b3b3", opacity: 0.5 };
        }
        if (isAcg) {
            return { color: colors.textSecondary, opacity: 0.4 };
        }
        if (isRetro) {
            return { color: colors.textSecondary, opacity: 0.5 };
        }
        return { color: "white", opacity: 0.6 };
    };

    const getHighlightStyle = () => {
        if (isSpotify) {
            return {
                color: "#ffffff",
                opacity: 1,
                fontSize: baseFontSize + rpx(2),
                fontWeight: "700",
            };
        }
        if (isAcg) {
            return {
                color: colors.primary,
                opacity: 1,
                fontSize: baseFontSize + rpx(2),
                fontWeight: "600",
                textShadowColor: "#9d79e8",
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: rpx(16),
            };
        }
        if (isRetro) {
            return { color: colors.primary, opacity: 1 };
        }
        return { color: colors.primary, opacity: 1 };
    };

    const getLightStyle = () => {
        if (isSpotify) {
            return { color: "#ffffff", opacity: 0.85 };
        }
        if (isAcg) {
            return {
                color: colors.text,
                opacity: 0.75,
                textShadowColor: "rgba(157,121,232,0.2)",
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: rpx(8),
            };
        }
        if (isRetro) {
            return { color: colors.text, opacity: 0.85 };
        }
        return { color: "white", opacity: 0.9 };
    };

    return (
        <Text
            onLayout={({ nativeEvent }) => {
                if (index !== undefined) {
                    onLayout?.(index, nativeEvent.layout.height);
                }
            }}
            style={[
                lyricStyles.item,
                {
                    fontSize: baseFontSize,
                    letterSpacing: isAcg ? rpx(1.5) : (isSpotify ? rpx(0.5) : 0),
                    lineHeight: isAcg ? baseFontSize * 1.8 : undefined,
                },
                getBaseStyle(),
                highlight ? [lyricStyles.highlightItem, getHighlightStyle()] : null,
                light ? [lyricStyles.draggingItem, getLightStyle()] : null,
            ]}>
            {text}
        </Text>
    );
}

const LyricItemComponent = memo(
    _LyricItemComponent,
    (prev, curr) =>
        prev.light === curr.light &&
        prev.highlight === curr.highlight &&
        prev.text === curr.text &&
        prev.index === curr.index &&
        prev.fontSize === curr.fontSize,
);

export default LyricItemComponent;

const lyricStyles = StyleSheet.create({
    highlightItem: {
        opacity: 1,
    },
    item: {
        paddingHorizontal: rpx(64),
        paddingVertical: rpx(22),
        width: "100%",
        textAlign: "center",
        textAlignVertical: "center",
    },
    draggingItem: {
        opacity: 0.9,
    },
});
