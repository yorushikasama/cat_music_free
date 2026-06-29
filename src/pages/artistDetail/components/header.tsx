import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import rpx from "@/utils/rpx";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useAtomValue } from "jotai";
import { scrollToTopAtom } from "../store/atoms";
import { useParams } from "@/core/router";
import { useI18N } from "@/core/i18n";
import MediaDetailHeader from "@/components/mediaDetailHeader";

const headerHeight = rpx(350);

interface IHeaderProps {
    neverFold?: boolean;
}

export default function Header(props: IHeaderProps) {
    const { neverFold } = props;

    const { artistItem } = useParams<"artist-detail">();

    const heightValue = useSharedValue(headerHeight);
    const opacityValue = useSharedValue(1);
    const scrollToTopState = useAtomValue(scrollToTopAtom);

    const { t } = useI18N();

    const heightStyle = useAnimatedStyle(() => {
        return {
            height: heightValue.value,
            opacity: opacityValue.value,
        };
    });

    const avatar = artistItem.avatar?.startsWith("//")
        ? `https:${artistItem.avatar}`
        : artistItem.avatar;

    /** 折叠 */
    useEffect(() => {
        if (neverFold) {
            heightValue.value = withTiming(headerHeight);
            opacityValue.value = withTiming(1);
            return;
        }
        if (scrollToTopState) {
            heightValue.value = withTiming(headerHeight);
            opacityValue.value = withTiming(1);
        } else {
            heightValue.value = withTiming(0);
            opacityValue.value = withTiming(0);
        }
    }, [scrollToTopState, neverFold, heightValue, opacityValue]);

    return (
        <Animated.View style={[styles.wrapper, heightStyle]}>
            <MediaDetailHeader
                cover={avatar}
                title={artistItem?.name}
                subtitle={
                    artistItem.fans
                        ? t("artistDetail.fansCount", {
                            count: artistItem.fans,
                        })
                        : undefined
                }
                platform={artistItem.platform}
                description={artistItem?.description}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: rpx(750),
        height: headerHeight,
        zIndex: 1,
        overflow: "hidden",
    },
});
