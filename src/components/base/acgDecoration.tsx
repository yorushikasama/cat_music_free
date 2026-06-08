import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, ViewStyle } from "react-native";
import rpx from "@/utils/rpx";
import Svg, { RNSVGCircle, RNSVGEllipse, RNSVGPath } from "react-native-svg";
import useColors from "@/hooks/useColors";
import Theme from "@/core/theme";

function Cloud({ size = rpx(80), x, y, opacity = 0.3 }: { size?: number; x: number; y: number; opacity?: number }) {
    const colors = useColors();
    const isAcg = Theme.useTheme().id.startsWith("p-acg");
    if (!isAcg) return null;

    return (
        <Svg width={size} height={size * 0.6} style={{ position: "absolute", left: x, top: y, opacity }}>
            <RNSVGEllipse cx={size * 0.35} cy={size * 0.4} rx={size * 0.25} ry={size * 0.2} fill={colors.primary} />
            <RNSVGEllipse cx={size * 0.55} cy={size * 0.35} rx={size * 0.3} ry={size * 0.22} fill={colors.primary} />
            <RNSVGEllipse cx={size * 0.7} cy={size * 0.4} rx={size * 0.2} ry={size * 0.17} fill={colors.primary} />
            <RNSVGEllipse cx={size * 0.5} cy={size * 0.48} rx={size * 0.38} ry={size * 0.12} fill={colors.primary} />
        </Svg>
    );
}

function Heart({ size = rpx(24), x, y, opacity = 0.25, rotation = 0 }: { size?: number; x: number; y: number; opacity?: number; rotation?: number }) {
    const colors = useColors();
    const isAcg = Theme.useTheme().id.startsWith("p-acg");
    if (!isAcg) return null;

    return (
        <Svg width={size} height={size} style={{ position: "absolute", left: x, top: y, opacity, transform: [{ rotate: `${rotation}deg` }] }}>
            <RNSVGPath
                d={`M ${size * 0.5} ${size * 0.85} C ${size * 0.15} ${size * 0.55} 0 ${size * 0.3} ${size * 0.15} ${size * 0.2} C ${size * 0.3} ${size * 0.05} ${size * 0.5} ${size * 0.15} ${size * 0.5} ${size * 0.35} C ${size * 0.5} ${size * 0.15} ${size * 0.7} ${size * 0.05} ${size * 0.85} ${size * 0.2} C ${size} ${size * 0.3} ${size * 0.85} ${size * 0.55} ${size * 0.5} ${size * 0.85} Z`}
                fill={colors.primary}
            />
        </Svg>
    );
}

function Star({ size = rpx(20), x, y, opacity = 0.2 }: { size?: number; x: number; y: number; opacity?: number }) {
    const colors = useColors();
    const isAcg = Theme.useTheme().id.startsWith("p-acg");
    if (!isAcg) return null;

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
        <Svg width={size} height={size} style={{ position: "absolute", left: x, top: y, opacity }}>
            <RNSVGPath d={path} fill={colors.primary} />
        </Svg>
    );
}

function RibbonBow({ size = rpx(40), x, y, opacity = 0.18 }: { size?: number; x: number; y: number; opacity?: number }) {
    const colors = useColors();
    const isAcg = Theme.useTheme().id.startsWith("p-acg");
    if (!isAcg) return null;

    const w = size;
    const h = size * 0.7;

    return (
        <Svg width={w} height={h} style={{ position: "absolute", left: x, top: y, opacity }}>
            <RNSVGPath
                d={`M ${w * 0.5} ${h * 0.5}
                   C ${w * 0.2} ${h * 0.15} ${w * 0.05} ${h * 0.3} ${w * 0.15} ${h * 0.5}
                   C ${w * 0.05} ${h * 0.7} ${w * 0.2} ${h * 0.85} ${w * 0.5} ${h * 0.5}
                   C ${w * 0.8} ${h * 0.85} ${w * 0.95} ${h * 0.7} ${w * 0.85} ${h * 0.5}
                   C ${w * 0.95} ${h * 0.3} ${w * 0.8} ${h * 0.15} ${w * 0.5} ${h * 0.5} Z`}
                fill={colors.primary}
            />
            <RNSVGCircle cx={w * 0.5} cy={h * 0.5} r={size * 0.06} fill="white" opacity={0.5} />
        </Svg>
    );
}

function FloatingBubbles() {
    const colors = useColors();
    const isAcg = Theme.useTheme().id.startsWith("p-acg");
    const animRefs = useRef<Animated.Value[]>([]);

    const bubbles = useMemo(() => {
        const items: Array<{
            id: number;
            x: number;
            startY: number;
            size: number;
            duration: number;
            delay: number;
            opacity: number;
        }> = [];
        const count = 16;
        for (let i = 0; i < count; i++) {
            items.push({
                id: i,
                x: Math.random() * 100,
                startY: 75 + Math.random() * 25,
                size: rpx(5 + Math.random() * 14),
                duration: 5000 + Math.random() * 7000,
                delay: Math.random() * 6000,
                opacity: 0.06 + Math.random() * 0.1,
            });
            animRefs.current[i] = new Animated.Value(0);
        }
        return items;
    }, []);

    useEffect(() => {
        if (!isAcg) return;

        const animations = bubbles.map((bubble, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(bubble.delay),
                    Animated.timing(animRefs.current[i], {
                        toValue: 1,
                        duration: bubble.duration,
                        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
                        useNativeDriver: true,
                    }),
                ]),
            ),
        );

        Animated.parallel(animations).start();
    }, [isAcg, bubbles]);

    if (!isAcg) return null;

    return (
        <>
            {bubbles.map((bubble, i) => {
                const translateY = animRefs.current[i]?.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -rpx(900)],
                }) ?? 0;

                const fadeOut = animRefs.current[i]?.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [bubble.opacity, bubble.opacity * 0.4, 0],
                }) ?? 0;

                return (
                    <Animated.View
                        key={bubble.id}
                        style={{
                            position: "absolute",
                            left: `${bubble.x}%`,
                            top: `${bubble.startY}%`,
                            transform: [{ translateY }],
                            opacity: fadeOut,
                        }}>
                        <Svg width={bubble.size} height={bubble.size}>
                            <RNSVGCircle
                                cx={bubble.size / 2}
                                cy={bubble.size / 2}
                                r={bubble.size / 2 - 1}
                                fill={colors.primary}
                                opacity={0.5}
                            />
                            <RNSVGCircle
                                cx={bubble.size * 0.35}
                                cy={bubble.size * 0.35}
                                r={bubble.size * 0.1}
                                fill="white"
                                opacity={0.4}
                            />
                        </Svg>
                    </Animated.View>
                );
            })}
        </>
    );
}

export default function AcgDecoration(_props: { style?: ViewStyle }) {
    const isAcg = Theme.useTheme().id.startsWith("p-acg");
    if (!isAcg) return null;

    return (
        <>
            <Cloud size={rpx(90)} x={rpx(30)} y={rpx(60)} opacity={0.08} />
            <Cloud size={rpx(70)} x={rpx(500)} y={rpx(100)} opacity={0.06} />
            <Cloud size={rpx(55)} x={rpx(250)} y={rpx(30)} opacity={0.07} />

            <Heart size={rpx(20)} x={rpx(120)} y={rpx(200)} opacity={0.12} rotation={15} />
            <Heart size={rpx(14)} x={rpx(600)} y={rpx(150)} opacity={0.1} rotation={-20} />
            <Heart size={rpx(24)} x={rpx(450)} y={rpx(80)} opacity={0.08} rotation={30} />
            <Heart size={rpx(12)} x={rpx(80)} y={rpx(400)} opacity={0.12} rotation={-10} />
            <Heart size={rpx(16)} x={rpx(650)} y={rpx(450)} opacity={0.1} rotation={25} />

            <Star size={rpx(16)} x={rpx(650)} y={rpx(250)} opacity={0.1} />
            <Star size={rpx(12)} x={rpx(180)} y={rpx(120)} opacity={0.08} />
            <Star size={rpx(18)} x={rpx(550)} y={rpx(350)} opacity={0.07} />
            <Star size={rpx(10)} x={rpx(350)} y={rpx(500)} opacity={0.1} />

            <RibbonBow size={rpx(36)} x={rpx(620)} y={rpx(60)} opacity={0.1} />
            <RibbonBow size={rpx(28)} x={rpx(50)} y={rpx(300)} opacity={0.08} />

            <FloatingBubbles />
        </>
    );
}

export { Cloud, Heart, Star, RibbonBow, FloatingBubbles };
