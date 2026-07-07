import { useAtomValue } from "jotai";
import React, { useEffect, useRef, useState } from "react";
import {
    AccessibilityInfo,
    Animated,
    Easing,
    Image,
    StyleSheet,
    View,
} from "react-native";
import bootstrapAtom from "./bootstrap.atom";

const splashCat = require("@/assets/imgs/splash-cat.gif");
const splashCatStill = require("@/assets/imgs/splash-cat-still.png");

const READY_HOLD_MS = 520;
const FADE_DURATION_MS = 180;

export function StartupSplashOverlay() {
    const bootstrapState = useAtomValue(bootstrapAtom);
    const [visible, setVisible] = useState(true);
    const [reduceMotion, setReduceMotion] = useState(false);
    const opacity = useRef(new Animated.Value(1)).current;

    const isReady =
        bootstrapState.state === "Done" || bootstrapState.state === "Fatal";

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled()
            .then(setReduceMotion)
            .catch(() => undefined);

        const subscription = AccessibilityInfo.addEventListener(
            "reduceMotionChanged",
            setReduceMotion,
        );

        return () => {
            subscription.remove();
        };
    }, []);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        const timer = setTimeout(() => {
            if (reduceMotion) {
                setVisible(false);
                return;
            }

            Animated.timing(opacity, {
                toValue: 0,
                duration: FADE_DURATION_MS,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) {
                    setVisible(false);
                }
            });
        }, READY_HOLD_MS);

        return () => {
            clearTimeout(timer);
            opacity.stopAnimation();
        };
    }, [isReady, opacity, reduceMotion]);

    if (!visible) {
        return null;
    }

    return (
        <Animated.View
            pointerEvents="auto"
            style={[styles.overlay, { opacity }]}>
            <View style={styles.iconStage}>
                <Image
                    source={reduceMotion ? splashCatStill : splashCat}
                    resizeMode="contain"
                    style={styles.icon}
                />
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        backgroundColor: "#27282C",
        elevation: 1000,
        justifyContent: "center",
        zIndex: 1000,
    },
    iconStage: {
        alignItems: "center",
        height: 180,
        justifyContent: "center",
        width: 180,
    },
    icon: {
        height: 180,
        width: 180,
    },
});
