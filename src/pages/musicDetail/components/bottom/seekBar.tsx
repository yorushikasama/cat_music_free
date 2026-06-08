import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import rpx from "@/utils/rpx";
import Slider from "@react-native-community/slider";
import timeformat from "@/utils/timeformat";
import { fontSizeConst } from "@/constants/uiConst";
import TrackPlayer, { useProgress } from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";

/**************** 类型定义 ******************/

interface ITimeLabelProps {
    time: number;
}

/**************** 时间标签组件 ******************/

/**
 * 时间标签组件，用于显示格式化后的播放时间
 * @param props.time - 时间值（秒）
 */
function TimeLabel(props: ITimeLabelProps) {
    const colors = useColors();

    const textColor = colors.seekTextColor;

    return (
        <Text style={[style.text, { color: textColor }]}>
            {timeformat(Math.max(props.time, 0))}
        </Text>
    );
}

/**************** 进度条组件 ******************/

/**
 * 播放进度条组件，展示当前播放进度并支持拖拽跳转
 * 包含左侧当前时间、中间滑块、右侧总时长三部分
 */
export default function SeekBar() {
    // 1. 获取播放进度（每秒刷新）
    const progress = useProgress(1000);

    // 2. 拖拽中的临时进度值，拖拽结束后清空
    const [tmpProgress, setTmpProgress] = useState<number | null>(null);

    // 3. 标记是否正在拖拽，避免拖拽时进度条回弹
    const slidingRef = useRef(false);

    // 4. 根据主题确定滑块颜色
    const colors = useColors();

    /*********** 滑块颜色配置 ***********/
    const minTrackColor = colors.seekTrackColor;
    const maxTrackColor = colors.seekInactiveTrackColor;
    const thumbColor = colors.seekThumbColor;

    return (
        <View style={style.wrapper}>
            {/* 当前播放时间：拖拽时显示临时进度，否则显示实际进度 */}
            <TimeLabel time={tmpProgress ?? progress.position} />
            <Slider
                style={style.slider}
                minimumTrackTintColor={minTrackColor}
                maximumTrackTintColor={maxTrackColor}
                thumbTintColor={thumbColor}
                minimumValue={0}
                maximumValue={progress.duration}
                onSlidingStart={() => {
                    // 开始拖拽，标记拖拽状态
                    slidingRef.current = true;
                }}
                onValueChange={val => {
                    // 拖拽过程中实时更新临时进度
                    if (slidingRef.current) {
                        setTmpProgress(val);
                    }
                }}
                onSlidingComplete={val => {
                    // 1. 结束拖拽，重置状态
                    slidingRef.current = false;
                    setTmpProgress(null);

                    // 2. 防止拖到末尾触发自然结束逻辑，限制最大值为总时长-2秒
                    if (val >= progress.duration - 2) {
                        val = progress.duration - 2;
                    }

                    // 3. 跳转到目标播放位置
                    TrackPlayer.seekTo(val);
                }}
                value={progress.position}
            />
            {/* 总时长 */}
            <TimeLabel time={progress.duration} />
        </View>
    );
}

/**************** 样式定义 ******************/

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        height: rpx(52),
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        paddingHorizontal: rpx(8),
    },
    slider: {
        flex: 1,
        height: rpx(52),
        marginHorizontal: rpx(12),
    },
    text: {
        fontSize: fontSizeConst.subTitle,
        includeFontPadding: false,
        fontVariant: ["tabular-nums"],
        minWidth: rpx(80),
        textAlign: "center",
    },
});
