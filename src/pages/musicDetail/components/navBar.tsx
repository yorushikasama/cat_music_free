import React from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import { useNavigation } from "@react-navigation/native";
import Share from "react-native-share";

import IconButton from "@/components/base/iconButton";
import { B64Asset } from "@/constants/assetsConst";
import useColors from "@/hooks/useColors";

export default function NavBar() {
    const navigation = useNavigation();
    const colors = useColors();

    const iconColor = colors.text;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.actionSide}>
                    <IconButton
                        name="arrow-left"
                        sizeType={"normal"}
                        color={iconColor}
                        style={styles.button}
                        onPress={() => {
                            navigation.goBack();
                        }}
                    />
                </View>
                <View style={styles.headerContent} />
                <View style={styles.actionSide}>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: rpx(96),
    },
    content: {
        width: "100%",
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    actionSide: {
        width: rpx(132),
        alignItems: "center",
    },
    button: {
        minWidth: rpx(72),
        minHeight: rpx(72),
        justifyContent: "center",
        alignItems: "center",
    },
    headerContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});
