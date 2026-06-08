import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import Image from "./image";
import useColors from "@/hooks/useColors";
import Theme from "@/core/theme";
import Color from "color";

function PageBackground() {
    const background = Theme.useBackground();
    const colors = useColors();
    const hasBg = !!background?.url;

    let baseBg = colors?.pageBackground ?? colors.background;
    if (hasBg) {
        try {
            const c = Color(baseBg);
            if (c.alpha() < 1) {
                baseBg = c.alpha(1).rgb().string();
            }
        } catch {}
    }

    return (
        <>
            <View
                style={[
                    style.wrapper,
                    {
                        backgroundColor: baseBg,
                    },
                ]}
            />
            {!hasBg ? null : (
                <Image
                    uri={background.url}
                    style={[
                        style.wrapper,
                        {
                            opacity: background?.opacity ?? 0.6,
                        },
                    ]}
                    blurRadius={background?.blur ?? 20}
                />
            )}
        </>
    );
}
export default memo(PageBackground, () => true);

const style = StyleSheet.create({
    wrapper: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
    },
});
