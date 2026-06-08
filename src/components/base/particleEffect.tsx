import React, { useEffect, useMemo, memo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useAppConfig } from "@/core/appConfig";
import Theme from "@/core/theme";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    withSequence,
    withDelay,
    cancelAnimation,
} from "react-native-reanimated";
import Svg, { Path, Circle } from "react-native-svg";

export type ParticleEffectType = "none" | "sakura" | "snow" | "star" | "firefly";

const PARTICLE_COUNT: Record<Exclude<ParticleEffectType, "none">, number> = {
    sakura: 14,
    snow: 20,
    star: 12,
    firefly: 16,
};

const DARK_COLORS: Record<Exclude<ParticleEffectType, "none">, string[]> = {
    sakura: ["#ffb7c5", "#ff8fa3", "#ffc2d1", "#ffa6c9", "#ff93ac", "#ffc8dd"],
    snow: ["#ffffff", "#e8f0fe", "#d6e4f0", "#c8d8e8", "#f0f4f8"],
    star: ["#ffd700", "#ffec8b", "#fff8dc", "#ffa500", "#ffe4b5"],
    firefly: ["#7fff00", "#adff2f", "#00ff7f", "#98fb98", "#90ee90"],
};

const LIGHT_COLORS: Record<Exclude<ParticleEffectType, "none">, string[]> = {
    sakura: ["#ffb7c5", "#ff8fa3", "#ffc2d1", "#ffa6c9", "#ff93ac", "#ffc8dd"],
    snow: ["#8a9ab5", "#7b8da8", "#6d7f9a", "#9aa8bc", "#8898ad"],
    star: ["#e6a800", "#cc9500", "#b8860b", "#d4a017", "#c49320"],
    firefly: ["#2d8f2d", "#3a9e3a", "#228B22", "#2e8b2e", "#3cb03c"],
};

interface ParticleConfig {
    startX: number;
    startY: number;
    size: number;
    duration: number;
    drift: number;
    delay: number;
    color: string;
    opacity: number;
    rotationRange: number;
    effectType: ParticleEffectType;
    layer: number;
    screenHeight: number;
}

function SakuraPetal({ size, color }: { size: number; color: string }) {
    const w = size;
    const h = size * 0.7;
    const petalPath = `M ${w * 0.5} ${h * 0.05}
        C ${w * 0.85} ${h * 0.05} ${w * 0.95} ${h * 0.45} ${w * 0.5} ${h * 0.95}
        C ${w * 0.05} ${h * 0.45} ${w * 0.15} ${h * 0.05} ${w * 0.5} ${h * 0.05} Z`;

    return (
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <Path d={petalPath} fill={color} opacity={0.85} />
            <Path
                d={`M ${w * 0.5} ${h * 0.15} Q ${w * 0.48} ${h * 0.5} ${w * 0.5} ${h * 0.85}`}
                stroke={color}
                strokeWidth={0.5}
                opacity={0.3}
                fill="none"
            />
        </Svg>
    );
}

function SnowflakeShape({ size, color }: { size: number; color: string }) {
    const r = size / 2;
    const branchLen = r * 0.8;
    const cx = r;
    const cy = r;

    const branches: React.ReactNode[] = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * Math.PI / 180;
        const ex = cx + branchLen * Math.cos(angle - Math.PI / 2);
        const ey = cy + branchLen * Math.sin(angle - Math.PI / 2);

        branches.push(
            <Path
                key={`b${i}`}
                d={`M ${cx} ${cy} L ${ex} ${ey}`}
                stroke={color}
                strokeWidth={size * 0.04}
                strokeLinecap="round"
            />,
        );
    }

    return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Circle cx={cx} cy={cy} r={size * 0.06} fill={color} />
            {branches}
        </Svg>
    );
}

function StarShape({ size, color }: { size: number; color: string }) {
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size * 0.45;
    const innerR = size * 0.2;
    let path = "";
    for (let i = 0; i < 5; i++) {
        const outerAngle = (Math.PI / 2) + (i * 2 * Math.PI / 5);
        const innerAngle = outerAngle + Math.PI / 5;
        const ox = cx + outerR * Math.cos(-outerAngle);
        const oy = cy - outerR * Math.sin(outerAngle);
        const ix = cx + innerR * Math.cos(-innerAngle);
        const iy = cy - innerR * Math.sin(innerAngle);
        path += (i === 0 ? "M" : "L") + ` ${ox} ${oy} L ${ix} ${iy} `;
    }
    path += "Z";

    return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Path d={path} fill={color} />
        </Svg>
    );
}

const fireflyStyles = StyleSheet.create({
    core: {
        borderRadius: 999,
    },
    outerGlow: {
        position: "absolute",
        borderRadius: 999,
        opacity: 0.15,
    },
    innerGlow: {
        position: "absolute",
        borderRadius: 999,
        opacity: 0.25,
    },
});

function FireflyGlow({ size, color }: { size: number; color: string }) {
    return (
        <View style={[fireflyStyles.core, { width: size, height: size, backgroundColor: color }]}>
            <View style={[fireflyStyles.outerGlow, {
                width: size * 3, height: size * 3,
                backgroundColor: color,
                top: -size, left: -size,
            }]} />
            <View style={[fireflyStyles.innerGlow, {
                width: size * 2, height: size * 2,
                backgroundColor: color,
                top: -size * 0.5, left: -size * 0.5,
            }]} />
        </View>
    );
}

function Particle({ config }: { config: ParticleConfig }) {
    const translateY = useSharedValue(config.startY);
    const rotation = useSharedValue(0);
    const driftX = useSharedValue(0);
    const startXShared = useSharedValue(config.startX);
    const startYShared = useSharedValue(config.startY);
    const opacityAnim = useSharedValue(config.opacity);
    const scaleX = useSharedValue(1);
    const wobbleX = useSharedValue(0);
    const wobbleY = useSharedValue(0);
    const effectTypeShared = useSharedValue(config.effectType);

    useEffect(() => {
        startXShared.value = config.startX;
        startYShared.value = config.startY;
        effectTypeShared.value = config.effectType;

        const totalDuration = config.duration;
        const targetY = config.screenHeight + 50;

        if (config.effectType === "firefly") {
            opacityAnim.value = withDelay(
                config.delay,
                withRepeat(
                    withSequence(
                        withTiming(config.opacity, { duration: 2000 + Math.random() * 2000, easing: Easing.inOut(Easing.sin) }),
                        withTiming(config.opacity * 0.15, { duration: 1500 + Math.random() * 1500, easing: Easing.inOut(Easing.sin) }),
                        withTiming(config.opacity, { duration: 2000 + Math.random() * 2000, easing: Easing.inOut(Easing.sin) }),
                    ),
                    -1,
                    false,
                ),
            );

            wobbleX.value = withDelay(
                config.delay,
                withRepeat(
                    withSequence(
                        withTiming(config.drift * 1.5, { duration: 3000 + Math.random() * 3000, easing: Easing.inOut(Easing.sin) }),
                        withTiming(-config.drift, { duration: 2500 + Math.random() * 2500, easing: Easing.inOut(Easing.sin) }),
                        withTiming(config.drift * 0.8, { duration: 3500 + Math.random() * 2000, easing: Easing.inOut(Easing.sin) }),
                        withTiming(-config.drift * 1.2, { duration: 3000 + Math.random() * 2000, easing: Easing.inOut(Easing.sin) }),
                    ),
                    -1,
                    false,
                ),
            );

            wobbleY.value = withDelay(
                config.delay,
                withRepeat(
                    withSequence(
                        withTiming(-config.drift * 0.8, { duration: 4000 + Math.random() * 3000, easing: Easing.inOut(Easing.sin) }),
                        withTiming(config.drift * 0.6, { duration: 3000 + Math.random() * 3000, easing: Easing.inOut(Easing.sin) }),
                        withTiming(-config.drift * 0.5, { duration: 3500 + Math.random() * 2500, easing: Easing.inOut(Easing.sin) }),
                    ),
                    -1,
                    false,
                ),
            );

            return () => {
                cancelAnimation(opacityAnim);
                cancelAnimation(wobbleX);
                cancelAnimation(wobbleY);
            };
        }

        // 下落动画：withRepeat 实现循环，粒子落出屏幕后自动重置到起始位置
        // 由于起始位置和终点都在屏幕外，重置时的跳变不可见
        translateY.value = withDelay(
            config.delay,
            withRepeat(
                withTiming(targetY, { duration: totalDuration, easing: Easing.linear }),
                -1,
                false,
            ),
        );

        driftX.value = withDelay(
            config.delay,
            withRepeat(
                withSequence(
                    withTiming(config.drift, { duration: totalDuration / 4, easing: Easing.inOut(Easing.sin) }),
                    withTiming(-config.drift, { duration: totalDuration / 4, easing: Easing.inOut(Easing.sin) }),
                    withTiming(config.drift, { duration: totalDuration / 4, easing: Easing.inOut(Easing.sin) }),
                    withTiming(-config.drift, { duration: totalDuration / 4, easing: Easing.inOut(Easing.sin) }),
                ),
                -1,
                false,
            ),
        );

        rotation.value = withDelay(
            config.delay,
            withRepeat(
                withTiming(config.rotationRange, { duration: totalDuration, easing: Easing.linear }),
                -1,
                false,
            ),
        );

        if (config.effectType === "sakura") {
            scaleX.value = withDelay(
                config.delay,
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: totalDuration / 8, easing: Easing.inOut(Easing.sin) }),
                        withTiming(0.3, { duration: totalDuration / 8, easing: Easing.inOut(Easing.sin) }),
                        withTiming(1, { duration: totalDuration / 8, easing: Easing.inOut(Easing.sin) }),
                        withTiming(0.3, { duration: totalDuration / 8, easing: Easing.inOut(Easing.sin) }),
                        withTiming(1, { duration: totalDuration / 8, easing: Easing.inOut(Easing.sin) }),
                        withTiming(0.3, { duration: totalDuration / 8, easing: Easing.inOut(Easing.sin) }),
                        withTiming(1, { duration: totalDuration / 8, easing: Easing.inOut(Easing.sin) }),
                        withTiming(0.3, { duration: totalDuration / 8, easing: Easing.inOut(Easing.sin) }),
                    ),
                    -1,
                    false,
                ),
            );
        }

        if (config.effectType === "star") {
            opacityAnim.value = withDelay(
                config.delay,
                withRepeat(
                    withSequence(
                        withTiming(config.opacity, { duration: totalDuration * 0.3, easing: Easing.inOut(Easing.quad) }),
                        withTiming(config.opacity * 0.3, { duration: totalDuration * 0.2, easing: Easing.inOut(Easing.quad) }),
                        withTiming(config.opacity, { duration: totalDuration * 0.3, easing: Easing.inOut(Easing.quad) }),
                        withTiming(config.opacity * 0.5, { duration: totalDuration * 0.2, easing: Easing.inOut(Easing.quad) }),
                    ),
                    -1,
                    false,
                ),
            );
        }

        if (config.effectType === "snow") {
            const layerOpacity = config.layer === 0
                ? config.opacity
                : config.layer === 1
                    ? config.opacity * 0.7
                    : config.opacity * 0.4;
            opacityAnim.value = layerOpacity;
        }

        return () => {
            cancelAnimation(translateY);
            cancelAnimation(rotation);
            cancelAnimation(driftX);
            cancelAnimation(opacityAnim);
            cancelAnimation(scaleX);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- useSharedValue 返回稳定引用，无需加入依赖
    }, [config]);

    const animatedStyle = useAnimatedStyle(() => {
        if (effectTypeShared.value === "firefly") {
            return {
                transform: [
                    { translateX: startXShared.value + wobbleX.value },
                    { translateY: startYShared.value + wobbleY.value },
                ],
                opacity: opacityAnim.value,
            };
        }

        return {
            transform: [
                { translateX: startXShared.value + driftX.value },
                { translateY: translateY.value },
                { rotate: `${rotation.value}deg` },
                ...(effectTypeShared.value === "sakura" ? [{ scaleX: scaleX.value }] : []),
            ],
            opacity: opacityAnim.value,
        };
    });

    const particleSize = config.size;

    if (config.effectType === "sakura") {
        return (
            <Animated.View style={[styles.particle, animatedStyle]}>
                <SakuraPetal size={particleSize} color={config.color} />
            </Animated.View>
        );
    }

    if (config.effectType === "snow") {
        const isDetailed = config.layer === 0;
        return (
            <Animated.View style={[styles.particle, animatedStyle]}>
                {isDetailed ? (
                    <SnowflakeShape size={particleSize} color={config.color} />
                ) : (
                    <View style={{
                        width: particleSize,
                        height: particleSize,
                        borderRadius: particleSize / 2,
                        backgroundColor: config.color,
                    }} />
                )}
            </Animated.View>
        );
    }

    if (config.effectType === "star") {
        return (
            <Animated.View style={[styles.particle, animatedStyle]}>
                <StarShape size={particleSize} color={config.color} />
            </Animated.View>
        );
    }

    if (config.effectType === "firefly") {
        return (
            <Animated.View style={[styles.particle, animatedStyle]}>
                <FireflyGlow size={particleSize} color={config.color} />
            </Animated.View>
        );
    }

    return null;
}

const MemoizedParticle = memo(Particle);

function generateParticles(
    effectType: Exclude<ParticleEffectType, "none">,
    screenWidth: number,
    screenHeight: number,
    isDark: boolean,
): ParticleConfig[] {
    const count = PARTICLE_COUNT[effectType];
    const colors = isDark ? DARK_COLORS[effectType] : LIGHT_COLORS[effectType];

    return Array.from({ length: count }, (_, i): ParticleConfig => {
        const baseConfig = {
            startX: Math.random() * screenWidth,
            startY: -50,
            delay: i * 350 + Math.random() * 400,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotationRange: 180 + Math.random() * 360,
            effectType,
            layer: 0,
            screenHeight,
        };

        switch (effectType) {
        case "sakura":
            return {
                ...baseConfig,
                size: 10 + Math.random() * 14,
                duration: 8000 + Math.random() * 12000,
                drift: 25 + Math.random() * 45,
                opacity: 0.35 + Math.random() * 0.45,
            };
        case "snow": {
            const layer = Math.random() < 0.3 ? 0 : (Math.random() < 0.6 ? 1 : 2);
            const layerScale = layer === 0 ? 1.2 : (layer === 1 ? 0.8 : 0.5);
            return {
                ...baseConfig,
                size: (4 + Math.random() * 8) * layerScale,
                duration: (8000 + Math.random() * 12000) * (layer === 0 ? 0.8 : layer === 1 ? 1 : 1.3),
                drift: (8 + Math.random() * 25) * layerScale,
                opacity: (0.5 + Math.random() * 0.4) * (layer === 0 ? 1 : layer === 1 ? 0.7 : 0.4),
                rotationRange: 360 + Math.random() * 720,
                layer,
                startY: -50 - Math.random() * 200,
            };
        }
        case "star":
            return {
                ...baseConfig,
                size: 8 + Math.random() * 12,
                duration: 6000 + Math.random() * 10000,
                drift: 30 + Math.random() * 50,
                opacity: 0.5 + Math.random() * 0.4,
                rotationRange: 360,
            };
        case "firefly":
            return {
                ...baseConfig,
                size: 3 + Math.random() * 5,
                duration: 15000 + Math.random() * 20000,
                drift: 20 + Math.random() * 35,
                opacity: 0.5 + Math.random() * 0.4,
                rotationRange: 90 + Math.random() * 180,
                startX: Math.random() * screenWidth,
                startY: screenHeight * 0.2 + Math.random() * screenHeight * 0.6,
            };
        }
    });
}

export default function ParticleEffect() {
    const effectType = (useAppConfig("theme.particleEffect") ?? "none") as ParticleEffectType;
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const theme = Theme.useTheme();
    const isDark = theme.dark;

    const particles = useMemo(() => {
        if (effectType === "none") return [];
        return generateParticles(effectType, screenWidth, screenHeight, isDark);
    }, [effectType, screenWidth, screenHeight, isDark]);

    if (effectType === "none" || particles.length === 0) {
        return null;
    }

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.map((config, i) => (
                <MemoizedParticle key={`${effectType}-${i}`} config={config} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
        elevation: 1,
    },
    particle: {
        position: "absolute",
        top: 0,
        left: 0,
        alignItems: "center",
        justifyContent: "center",
    },
});
