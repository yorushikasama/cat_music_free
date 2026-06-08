import React from "react";
import { StyleSheet, Text, View } from "react-native";
import rpx from "@/utils/rpx";
import { useNavigation } from "@react-navigation/native";
import Share from "react-native-share";

import Tag from "@/components/base/tag";
import IconButton from "@/components/base/iconButton";
import { B64Asset } from "@/constants/assetsConst";
import { fontSizeConst, fontWeightConst } from "@/constants/uiConst";
import { useCurrentMusic } from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";
import Color from "color";

export default function NavBar() {
    const navigation = useNavigation();
    const musicItem = useCurrentMusic();
    const colors = useColors();

    const iconColor = colors.text;
    const titleColor = colors.text;
    const artistColor = colors.textSecondary;
    const tagBgColor = Color(colors.primary).alpha(0.12).rgb().string();
    const tagTextColor = colors.accent ?? colors.primary;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <IconButton
                    name="arrow-left"
                    sizeType={"normal"}
                    color={iconColor}
                    style={styles.button}
                    onPress={() => {
                        navigation.goBack();
                    }}
                />
                <View style={styles.headerContent}>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.headerTitleText,
                            { color: titleColor },
                        ]}>
                        {musicItem?.title ?? "--"}
                    </Text>
                    <View style={styles.headerDesc}>
                        <Text
                            style={[
                                styles.headerArtistText,
                                { color: artistColor },
                            ]}
                            numberOfLines={1}>
                            {musicItem?.artist}
                        </Text>
                        {musicItem?.platform ? (
                            <Tag
                                tagName={musicItem.platform}
                                containerStyle={[
                                    styles.tagBg,
                                    { backgroundColor: tagBgColor },
                                ]}
                                style={[
                                    styles.tagText,
                                    { color: tagTextColor },
                                ]}
                            />
                        ) : null}
                    </View>
                </View>
                <IconButton
                    name="share"
                    color={iconColor}
                    sizeType="normal"
                    style={styles.button}
                    onPress={async () => {
                        try {
                            await Share.open({
                                type: "image/jpeg",
                                title: "CatMusicFree-一个插件化的免费音乐播放器",
                                message: "CatMusicFree-一个插件化的免费音乐播放器",
                                url: B64Asset.share,
                                subject: "CatMusicFree分享",
                            });
                        } catch {}
                    }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: rpx(120),
    },
    content: {
        width: "100%",
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    button: {
        marginHorizontal: rpx(20),
        minWidth: rpx(88),
        minHeight: rpx(88),
        justifyContent: "center",
        alignItems: "center",
    },
    headerContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitleText: {
        fontWeight: fontWeightConst.semibold,
        fontSize: fontSizeConst.title,
        marginBottom: rpx(6),
        includeFontPadding: false,
    },
    headerDesc: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: rpx(40),
    },
    headerArtistText: {
        fontSize: fontSizeConst.subTitle,
        includeFontPadding: false,
    },
    tagBg: {},
    tagText: {},
});
