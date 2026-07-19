import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import { useNavigation } from "@react-navigation/native";
import Share from "react-native-share";

import IconButton from "@/components/base/iconButton";
import { B64Asset } from "@/constants/assetsConst";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";
import Toast from "@/utils/toast";

export default function NavBar() {
    const navigation = useNavigation();
    const colors = useColors();
    const { t } = useI18N();
    const [sharing, setSharing] = useState(false);

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
                        accessibilityLabel={t("a11y.back")}
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
                        accessibilityLabel={t("a11y.share")}
                        loading={sharing}
                        onPress={async () => {
                            if (sharing) {
                                return;
                            }

                            setSharing(true);
                            try {
                                await Share.open({
                                    type: "image/jpeg",
                                    title: "CatMusicFree-一个插件化的免费音乐播放器",
                                    message:
                                        "CatMusicFree-一个插件化的免费音乐播放器",
                                    url: B64Asset.share,
                                    subject: "CatMusicFree分享",
                                });
                            } catch (error: any) {
                                const message = error?.message;
                                if (
                                    message &&
                                    !/cancel(?:led)?|dismiss/i.test(message)
                                ) {
                                    Toast.warn(
                                        t("toast.unknownError", {
                                            reason: message,
                                        }),
                                    );
                                }
                            } finally {
                                setSharing(false);
                            }
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
