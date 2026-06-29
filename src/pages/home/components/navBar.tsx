import { ROUTE_PATH } from "@/core/router";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import { useI18N } from "@/core/i18n";
import { spacing } from "@/constants/spacing";
import SearchInput from "@/components/base/searchInput";

export default function NavBar() {
    const navigation = useNavigation<any>();
    const { t } = useI18N();

    return (
        <View style={styles.appbar}>
            <SearchInput
                containerStyle={styles.searchBar}
                accessible
                accessibilityLabel={t("home.clickToSearch")}
                placeholder={t("home.clickToSearch")}
                editable={false}
                value=""
                onPress={() => {
                    navigation.navigate(ROUTE_PATH.SEARCH_PAGE);
                }}
            />
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
        minHeight: rpx(68),
    },
});
