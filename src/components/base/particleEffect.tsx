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
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Ellipse } from "react-native-svg";
import { toSvgColor } from "@/utils/svgColor";

export type ParticleEffectType = "none" | "sakura" | "snow" | "star" | "firefly";

const PARTICLE_COUNT: Record<Exclude<ParticleEffectType, "none">, number> = {
    sakura: 14,
    snow: 20,
    star: 12,
    firefly: 12,
};

const DARK_COLORS: Record<Exclude<ParticleEffectType, "none">, string[]> = {
    sakura: ["#ffb7c5", "#ff8fa3", "#ffc2d1", "#ffa6c9", "#ff93ac", "#ffc8dd"],
    snow: ["#ffffff", "#e8f0fe", "#d6e4f0", "#c8d8e8", "#f0f4f8"],
    star: ["#ffd700", "#ffec8b", "#fff8dc", "#ffa500", "#ffe4b5"],
    firefly: ["#f2ff7a", "#d8ff61", "#b8ff5f", "#fff3a3", "#a7f05a"],
};

const LIGHT_COLORS: Record<Exclude<ParticleEffectType, "none">, string[]> = {
    sakura: ["#ffb7c5", "#ff8fa3", "#ffc2d1", "#ffa6c9", "#ff93ac", "#ffc8dd"],
    snow: ["#8a9ab5", "#7b8da8", "#6d7f9a", "#9aa8bc", "#8898ad"],
    star: ["#e6a800", "#cc9500", "#b8860b", "#d4a017", "#c49320"],
    firefly: ["#6f8f12", "#789a1b", "#8b8f1c", "#5f8c35", "#748f2a"],
};

const BASE_SCREEN_AREA = 390 * 844;

interface ParticleConfig {
    id: string;
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
    const svgColor = toSvgColor(color);
    const petalPath = `M ${w * 0.5} ${h * 0.05}
        C ${w * 0.85} ${h * 0.05} ${w * 0.95} ${h * 0.45} ${w * 0.5} ${h * 0.95}
        C ${w * 0.05} ${h * 0.45} ${w * 0.15} ${h * 0.05} ${w * 0.5} ${h * 0.05} Z`;

    return (
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <Path d={petalPath} fill={svgColor} opacity={0.85} />
            <Path
                d={`M ${w * 0.5} ${h * 0.15} Q ${w * 0.48} ${h * 0.5} ${w * 0.5} ${h * 0.85}`}
                stroke={svgColor}
                strokeWidth={0.5}
                opacity={0.3}
                fill="none"
            />
        </Svg>
    );
}

function SnowflakeShape({ size, color }: { size: number; color: string }) {
    const svgColor = toSvgColor(color);
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
                stroke={svgColor}
                strokeWidth={size * 0.04}
                strokeLinecap="round"
            />,
        );
    }

    return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Circle cx={cx} cy={cy} r={size * 0.06} fill={svgColor} />
            {branches}
        </Svg>
    );
}

function StarShape({ size, color }: { size: number; color: string }) {
    const svgColor = toSvgColor(color);
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
            <Path d={path} fill={svgColor} />
        </Svg>
    );
}

function FireflyGlow({
    size,
    color,
    layer,
    glowId,
}: {
    size: number;
    color: string;
    layer: number;
    glowId: string;
}) {
    const svgColor = toSvgColor(color);
    const glowScale = layer === 0 ? 10.2 : layer === 1 ? 8.8 : 7.2;
    const glowSize = size * glowScale;
    const center = glowSize / 2;
    const haloId = `${glowId}-halo`;
    const lanternId = `${glowId}-lantern`;
    const abdomenX = center + size * 1.2;
    const thoraxX = center - size * 0.45;
    const headX = center - size * 1.42;
    const bodyColor = layer === 0 ? "#21170f" : layer === 1 ? "#2d2114" : "#3b321f";
    const thoraxColor = layer === 0 ? "#704122" : "#815326";
    const wingOpacity = layer === 0 ? 0.38 : layer === 1 ? 0.28 : 0.18;
    const haloOpacity = layer === 0 ? 0.3 : layer === 1 ? 0.22 : 0.15;
    const lanternOpacity = layer === 0 ? 0.96 : layer === 1 ? 0.82 : 0.64;
    const antennaOpacity = layer === 0 ? 0.55 : 0.36;

    return (
        <View style={{ width: glowSize, height: glowSize, marginLeft: -center, marginTop: -center }}>
            <Svg width={glowSize} height={glowSize} viewBox={`0 0 ${glowSize} ${glowSize}`}>
                <Defs>
                    <RadialGradient id={haloId} cx="50%" cy="50%" r="50%">
                        <Stop offset="0" stopColor={svgColor} stopOpacity={0.72} />
                        <Stop offset="0.24" stopColor={svgColor} stopOpacity={haloOpacity} />
                        <Stop offset="1" stopColor={svgColor} stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient id={lanternId} cx="50%" cy="50%" r="50%">
                        <Stop offset="0" stopColor="#fff9b7" stopOpacity={1} />
                        <Stop offset="0.38" stopColor={svgColor} stopOpacity={lanternOpacity} />
                        <Stop offset="0.52" stopColor={svgColor} stopOpacity={haloOpacity} />
                        <Stop offset="1" stopColor={svgColor} stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Circle cx={abdomenX} cy={center} r={size * (layer === 0 ? 3.05 : 2.55)} fill={`url(#${haloId})`} />
                <Path
                    d={`M ${thoraxX - size * 0.2} ${center - size * 0.14}
                        C ${thoraxX + size * 0.4} ${center - size * 2.25}
                          ${abdomenX + size * 2.5} ${center - size * 2.08}
                          ${abdomenX + size * 1.25} ${center - size * 0.2}
                        C ${abdomenX + size * 0.55} ${center - size * 0.36}
                          ${thoraxX + size * 0.42} ${center - size * 0.28}
                          ${thoraxX - size * 0.2} ${center - size * 0.14} Z`}
                    fill="#f7f0c8"
                    opacity={wingOpacity}
                />
                <Path
                    d={`M ${thoraxX - size * 0.08} ${center + size * 0.18}
                        C ${thoraxX + size * 0.55} ${center + size * 2}
                          ${abdomenX + size * 2.15} ${center + size * 1.55}
                          ${abdomenX + size * 1.02} ${center + size * 0.26}
                        C ${abdomenX + size * 0.42} ${center + size * 0.36}
                          ${thoraxX + size * 0.42} ${center + size * 0.3}
                          ${thoraxX - size * 0.08} ${center + size * 0.18} Z`}
                    fill="#e7f7d4"
                    opacity={wingOpacity * 0.78}
                />
                <Path
                    d={`M ${headX - size * 0.22} ${center - size * 0.06}
                        C ${headX + size * 0.85} ${center - size * 0.78}
                          ${abdomenX + size * 0.26} ${center - size * 0.66}
                          ${abdomenX + size * 0.92} ${center - size * 0.02}
                        C ${abdomenX + size * 0.22} ${center + size * 0.72}
                          ${headX + size * 0.68} ${center + size * 0.66}
                          ${headX - size * 0.22} ${center + size * 0.06} Z`}
                    fill={bodyColor}
                    opacity={layer === 2 ? 0.62 : 0.82}
                />
                <Ellipse
                    cx={abdomenX}
                    cy={center}
                    rx={size * 1.2}
                    ry={size * 0.76}
                    fill={`url(#${lanternId})`}
                />
                <Circle cx={thoraxX} cy={center} r={size * 0.68} fill={thoraxColor} opacity={layer === 2 ? 0.62 : 0.88} />
                <Circle cx={headX} cy={center} r={size * 0.42} fill="#17130f" opacity={layer === 2 ? 0.58 : 0.82} />
                <Path
                    d={`M ${headX - size * 0.24} ${center - size * 0.18}
                        Q ${headX - size * 0.94} ${center - size * 0.84}
                          ${headX - size * 1.48} ${center - size * 0.5}
                        M ${headX - size * 0.24} ${center + size * 0.18}
                        Q ${headX - size * 0.94} ${center + size * 0.84}
                          ${headX - size * 1.48} ${center + size * 0.5}`}
                    stroke={bodyColor}
                    strokeWidth={Math.max(0.45, size * 0.08)}
                    strokeLinecap="round"
                    fill="none"
                    opacity={antennaOpacity}
                />
            </Svg>
        </View>
    );
}

function getParticleCount(
    effectType: Exclude<ParticleEffectType, "none">,
    screenWidth: number,
    screenHeight: number,
): number {
    if (effectType !== "firefly") {
        return PARTICLE_COUNT[effectType];
    }

    const areaScale = Math.min(1.35, Math.max(0.75, (screenWidth * screenHeight) / BASE_SCREEN_AREA));
    return Math.round(PARTICLE_COUNT.firefly * areaScale);
}

function getFireflyLayer(): number {
    const value = Math.random();
    if (value < 0.24) return 0;
    if (value < 0.74) return 1;
    return 2;
}

function Particle({ config }: { config: ParticleConfig }) {
    const translateY = useSharedValue(config.startY);
    const rotation = useSharedValue(0);
    const driftX = useSharedValue(0);
    const startXShared = useSharedValue(config.startX);
    const startYShared = useSharedValue(config.startY);
    const opacityAnim = useSharedValue(config.opacity);
    const scaleX = useSharedValue(1);
    const scale = useSharedValue(1);
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
            const restingScale = config.layer === 0 ? 0.94 : config.layer === 1 ? 0.82 : 0.68;
            const flashScale = restingScale * (config.layer === 0 ? 1.34 : 1.24);
            const emberOpacity = config.opacity * (config.layer === 2 ? 0.08 : 0.12);
            const flashOpacity = Math.min(1, config.opacity * (config.layer === 0 ? 1.18 : 1.08));
            const afterglowOpacity = config.opacity * (config.layer === 0 ? 0.56 : 0.42);
            const firstIdle = 600 + Math.random() * 2200;
            const flashInDuration = 90 + Math.random() * 120;
            const afterglowDuration = 180 + Math.random() * 220;
            const fadeDuration = 520 + Math.random() * 480;
            const darkInterval = 2600 + Math.random() * 5200;
            const doubleFlash = config.layer !== 2 && Math.random() > 0.48;
            const doubleFlashOpacity = flashOpacity * (0.58 + Math.random() * 0.2);
            const doubleFlashDelay = 160 + Math.random() * 260;
            const doubleFlashDuration = 70 + Math.random() * 90;
            const doubleFadeDuration = 420 + Math.random() * 420;
            const verticalDrift = config.drift * (config.layer === 0 ? 0.34 : config.layer === 1 ? 0.25 : 0.18);
            const heading = config.rotationRange;

            opacityAnim.value = emberOpacity;
            scale.value = restingScale;
            rotation.value = heading;

            opacityAnim.value = withDelay(
                config.delay,
                withRepeat(
                    withSequence(
                        withTiming(emberOpacity, { duration: firstIdle, easing: Easing.linear }),
                        withTiming(flashOpacity, { duration: flashInDuration, easing: Easing.out(Easing.quad) }),
                        withTiming(afterglowOpacity, { duration: afterglowDuration, easing: Easing.inOut(Easing.sin) }),
                        withTiming(emberOpacity, { duration: fadeDuration, easing: Easing.out(Easing.cubic) }),
                        ...(doubleFlash ? [
                            withTiming(emberOpacity, { duration: doubleFlashDelay, easing: Easing.linear }),
                            withTiming(doubleFlashOpacity, { duration: doubleFlashDuration, easing: Easing.out(Easing.quad) }),
                            withTiming(emberOpacity, { duration: doubleFadeDuration, easing: Easing.out(Easing.cubic) }),
                        ] : []),
                        withTiming(emberOpacity, { duration: darkInterval, easing: Easing.linear }),
                    ),
                    -1,
                    false,
                ),
            );

            scale.value = withDelay(
                config.delay,
                withRepeat(
                    withSequence(
                        withTiming(restingScale, { duration: firstIdle, easing: Easing.linear }),
                        withTiming(flashScale, { duration: flashInDuration, easing: Easing.out(Easing.quad) }),
                        withTiming(restingScale, { duration: afterglowDuration + fadeDuration, easing: Easing.out(Easing.cubic) }),
                        ...(doubleFlash ? [
                            withTiming(restingScale, { duration: doubleFlashDelay, easing: Easing.linear }),
                            withTiming(flashScale * 0.9, { duration: doubleFlashDuration, easing: Easing.out(Easing.quad) }),
                            withTiming(restingScale, { duration: doubleFadeDuration, easing: Easing.out(Easing.cubic) }),
                        ] : []),
                        withTiming(restingScale, { duration: darkInterval, easing: Easing.linear }),
                    ),
                    -1,
                    false,
                ),
            );

            wobbleX.value = withDelay(
                config.delay,
                withRepeat(
                    withSequence(
                        withTiming(config.drift * 0.74, { duration: totalDuration * 0.28, easing: Easing.inOut(Easing.sin) }),
                        withTiming(-config.drift * 0.52, { duration: totalDuration * 0.32, easing: Easing.inOut(Easing.sin) }),
                        withTiming(config.drift * 0.36, { duration: totalDuration * 0.22, easing: Easing.inOut(Easing.sin) }),
                        withTiming(-config.drift * 0.18, { duration: totalDuration * 0.18, easing: Easing.inOut(Easing.sin) }),
                    ),
                    -1,
                    false,
                ),
            );

            wobbleY.value = withDelay(
                config.delay,
                withRepeat(
                    withSequence(
                        withTiming(-verticalDrift, { duration: totalDuration * 0.36, easing: Easing.inOut(Easing.sin) }),
                        withTiming(verticalDrift * 0.54, { duration: totalDuration * 0.3, easing: Easing.inOut(Easing.sin) }),
                        withTiming(-verticalDrift * 0.28, { duration: totalDuration * 0.2, easing: Easing.inOut(Easing.sin) }),
                        withTiming(verticalDrift * 0.18, { duration: totalDuration * 0.14, easing: Easing.inOut(Easing.sin) }),
                    ),
                    -1,
                    false,
                ),
            );

            rotation.value = withDelay(
                config.delay,
                withRepeat(
                    withSequence(
                        withTiming(heading + 7, { duration: totalDuration * 0.42, easing: Easing.inOut(Easing.sin) }),
                        withTiming(heading - 5, { duration: totalDuration * 0.34, easing: Easing.inOut(Easing.sin) }),
                        withTiming(heading + 2, { duration: totalDuration * 0.24, easing: Easing.inOut(Easing.sin) }),
                    ),
                    -1,
                    false,
                ),
            );

            return () => {
                cancelAnimation(opacityAnim);
                cancelAnimation(scale);
                cancelAnimation(wobbleX);
                cancelAnimation(wobbleY);
                cancelAnimation(rotation);
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
            cancelAnimation(scale);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- useSharedValue 返回稳定引用，无需加入依赖
    }, [config]);

    const animatedStyle = useAnimatedStyle(() => {
        if (effectTypeShared.value === "firefly") {
            return {
                transform: [
                    { translateX: startXShared.value + wobbleX.value },
                    { translateY: startYShared.value + wobbleY.value },
                    { rotate: `${rotation.value}deg` },
                    { scale: scale.value },
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
                <FireflyGlow
                    size={particleSize}
                    color={config.color}
                    layer={config.layer}
                    glowId={`firefly-${config.id}`}
                />
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
    const count = getParticleCount(effectType, screenWidth, screenHeight);
    const colors = isDark ? DARK_COLORS[effectType] : LIGHT_COLORS[effectType];

    return Array.from({ length: count }, (_, i): ParticleConfig => {
        const baseConfig = {
            id: `${effectType}-${i}`,
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
            const layer = getFireflyLayer();
            const layerScale = layer === 0 ? 1.18 : layer === 1 ? 0.92 : 0.68;
            return {
                ...baseConfig,
                size: (4.2 + Math.random() * 3.8) * layerScale,
                duration: 9000 + Math.random() * 10500,
                drift: (28 + Math.random() * 42) * layerScale,
                opacity: (isDark ? 0.58 + Math.random() * 0.36 : 0.34 + Math.random() * 0.26) * layerScale,
                rotationRange: -24 + Math.random() * 48,
                delay: Math.random() * 7600,
                layer,
                startX: Math.random() * (screenWidth + 80) - 40,
                startY: screenHeight * 0.18 + Math.random() * screenHeight * 0.64,
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
