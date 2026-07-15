import React from "react";
import {
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { CustomizedColors } from "@/hooks/useColors";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";

export type ThemePreviewEffect = "firefly" | undefined;

interface IThemePreviewProps {
    colors: Partial<CustomizedColors>;
    effect?: ThemePreviewEffect;
    style?: StyleProp<ViewStyle>;
}

function getColor(
    colors: Partial<CustomizedColors>,
    key: keyof CustomizedColors,
    fallback: string,
) {
    const value = colors[key];
    return typeof value === "string" && value ? value : fallback;
}

/**
 * A compact, non-interactive representation of the player shell. It gives a
 * theme choice more useful information than a single swatch without trying to
 * reproduce a full screen in a settings control.
 */
export default function ThemePreview(props: IThemePreviewProps) {
    const { colors, effect, style } = props;
    const pageBackground = getColor(colors, "pageBackground", "#101214");
    const surface = getColor(colors, "surfacePrimary", "#1c2023");
    const appBar = getColor(colors, "appBar", surface);
    const appBarText = getColor(colors, "appBarText", "#ffffff");
    const musicBar = getColor(colors, "musicBar", surface);
    const musicBarText = getColor(colors, "musicBarText", "#ffffff");
    const text = getColor(colors, "text", "#ffffff");
    const textSecondary = getColor(colors, "textSecondary", text);
    const primary = getColor(colors, "primary", "#5fb6c7");
    const accent = getColor(colors, "accent", primary);
    const inactiveTrack = getColor(
        colors,
        "progressInactiveColor",
        "rgba(255,255,255,0.24)",
    );

    return (
        <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={[styles.root, style, { backgroundColor: pageBackground }]}> 
            <View style={[styles.appBar, { backgroundColor: appBar }]}>
                <View
                    style={[styles.appBarTitle, { backgroundColor: appBarText }]}
                />
                <View
                    style={[styles.appBarAction, { backgroundColor: appBarText }]}
                />
            </View>

            <View style={styles.content}>
                <View style={[styles.artwork, { backgroundColor: primary }]}>
                    <View
                        style={[
                            styles.artworkHighlight,
                            { backgroundColor: accent },
                        ]}
                    />
                    <View
                        style={[
                            styles.artworkGlyph,
                            { backgroundColor: appBarText },
                        ]}
                    />
                </View>
                <View style={styles.trackInfo}>
                    <View
                        style={[styles.titleLine, { backgroundColor: text }]}
                    />
                    <View
                        style={[
                            styles.subtitleLine,
                            { backgroundColor: textSecondary },
                        ]}
                    />
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressInactive,
                                { backgroundColor: inactiveTrack },
                            ]}
                        />
                        <View
                            style={[
                                styles.progressActive,
                                { backgroundColor: primary },
                            ]}
                        />
                    </View>
                </View>
            </View>

            <View style={[styles.libraryCard, { backgroundColor: surface }]}>
                <View style={[styles.libraryIcon, { backgroundColor: primary }]} />
                <View
                    style={[styles.libraryLine, { backgroundColor: textSecondary }]}
                />
                <View
                    style={[
                        styles.libraryLineShort,
                        { backgroundColor: textSecondary },
                    ]}
                />
            </View>

            <View style={[styles.musicBar, { backgroundColor: musicBar }]}>
                <View
                    style={[styles.musicBarArtwork, { backgroundColor: primary }]}
                />
                <View style={styles.musicBarCopy}>
                    <View
                        style={[
                            styles.musicBarTitle,
                            { backgroundColor: musicBarText },
                        ]}
                    />
                    <View
                        style={[
                            styles.musicBarSubtitle,
                            { backgroundColor: musicBarText },
                        ]}
                    />
                </View>
                <View
                    style={[styles.playButton, { backgroundColor: primary }]}
                />
            </View>

            {effect === "firefly" ? (
                <>
                    <View
                        style={[
                            styles.firefly,
                            styles.fireflyOne,
                            { backgroundColor: accent },
                        ]}
                    />
                    <View
                        style={[
                            styles.firefly,
                            styles.fireflyTwo,
                            { backgroundColor: accent },
                        ]}
                    />
                    <View
                        style={[
                            styles.firefly,
                            styles.fireflyThree,
                            { backgroundColor: accent },
                        ]}
                    />
                </>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        width: "100%",
        aspectRatio: 0.94,
        overflow: "hidden",
        borderRadius: radius.sm,
        padding: spacing.sm,
    },
    appBar: {
        height: "14%",
        borderRadius: radius.xs,
        paddingHorizontal: spacing.xs,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    appBarTitle: {
        width: "38%",
        height: "20%",
        borderRadius: radius.pill,
        opacity: 0.88,
    },
    appBarAction: {
        width: "10%",
        aspectRatio: 1,
        borderRadius: radius.pill,
        opacity: 0.88,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.sm,
    },
    artwork: {
        width: "31%",
        aspectRatio: 1,
        borderRadius: radius.sm,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
    },
    artworkHighlight: {
        position: "absolute",
        top: "-20%",
        right: "-18%",
        width: "76%",
        aspectRatio: 1,
        borderRadius: radius.pill,
        opacity: 0.55,
    },
    artworkGlyph: {
        width: "24%",
        aspectRatio: 1,
        borderRadius: radius.pill,
        opacity: 0.88,
    },
    trackInfo: {
        flex: 1,
        minWidth: 0,
        marginLeft: spacing.sm,
    },
    titleLine: {
        width: "84%",
        height: 4,
        borderRadius: radius.pill,
        opacity: 0.92,
    },
    subtitleLine: {
        width: "58%",
        height: 3,
        borderRadius: radius.pill,
        marginTop: spacing.xs,
        opacity: 0.72,
    },
    progressTrack: {
        height: 3,
        width: "100%",
        marginTop: spacing.sm,
        overflow: "hidden",
        borderRadius: radius.pill,
    },
    progressInactive: {
        ...StyleSheet.absoluteFillObject,
    },
    progressActive: {
        width: "47%",
        height: "100%",
        borderRadius: radius.pill,
    },
    libraryCard: {
        height: "19%",
        marginTop: spacing.sm,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
    },
    libraryIcon: {
        width: "10%",
        aspectRatio: 1,
        borderRadius: radius.xs,
    },
    libraryLine: {
        width: "39%",
        height: 3,
        borderRadius: radius.pill,
        marginLeft: spacing.sm,
        opacity: 0.65,
    },
    libraryLineShort: {
        width: "18%",
        height: 3,
        borderRadius: radius.pill,
        marginLeft: spacing.xs,
        opacity: 0.42,
    },
    musicBar: {
        height: "17%",
        position: "absolute",
        left: spacing.sm,
        right: spacing.sm,
        bottom: spacing.sm,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.xs,
        flexDirection: "row",
        alignItems: "center",
    },
    musicBarArtwork: {
        height: "64%",
        aspectRatio: 1,
        borderRadius: radius.xs,
    },
    musicBarCopy: {
        flex: 1,
        marginLeft: spacing.xs,
        minWidth: 0,
    },
    musicBarTitle: {
        width: "72%",
        height: 3,
        borderRadius: radius.pill,
        opacity: 0.9,
    },
    musicBarSubtitle: {
        width: "48%",
        height: 2,
        borderRadius: radius.pill,
        marginTop: 3,
        opacity: 0.58,
    },
    playButton: {
        width: "12%",
        aspectRatio: 1,
        borderRadius: radius.pill,
    },
    firefly: {
        position: "absolute",
        width: 4,
        aspectRatio: 1,
        borderRadius: radius.pill,
        opacity: 0.72,
    },
    fireflyOne: {
        top: "30%",
        right: "12%",
    },
    fireflyTwo: {
        top: "52%",
        left: "11%",
        opacity: 0.48,
    },
    fireflyThree: {
        top: "17%",
        left: "49%",
        opacity: 0.56,
    },
});
