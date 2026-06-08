import { ROUTE_PATH } from "@/core/router";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import Icon from "@/components/base/icon.tsx";
import { useI18N } from "@/core/i18n";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";

export default function NavBar() {
    const navigation = useNavigation<any>();
    const colors = useColors();
    const { t } = useI18N();

    return (
        <View style={styles.appbar}>
            <Pressable
                style={[
                    styles.searchBar,
                    {
                        backgroundColor: colors.surfaceTertiary,
                    },
                ]}
                accessible
                accessibilityLabel={t("home.clickToSearch")}
                onPress={() => {
                    navigation.navigate(ROUTE_PATH.SEARCH_PAGE);
                }}>
                <View style={styles.searchBarInner}>
                    <Icon
                        accessible={false}
                        name="magnifying-glass"
                        size={rpx(28)}
                        color={colors.textSecondary}
                    />
                    <ThemeText
                        accessible={false}
                        fontSize="subTitle"
                        fontColor="textSecondary"
                        style={styles.text}>
                        {t("home.clickToSearch")}
                    </ThemeText>
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    appbar: {
        backgroundColor: "transparent",
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        height: rpx(96),
        paddingHorizontal: spacing.md,
    },
    searchBar: {
        flex: 1,
        height: rpx(72),
        borderRadius: radius.pill,
        overflow: "hidden",
    },
    searchBarInner: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        height: "100%",
        paddingHorizontal: spacing.lg,
        gap: rpx(8),
    },
    text: {
        opacity: 0.6,
        fontWeight: "400",
    },
});
