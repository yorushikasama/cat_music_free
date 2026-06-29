import React from "react";
import { StyleSheet } from "react-native";
import Mode from "./mode";
import Background from "./background";
import { ScrollView } from "react-native-gesture-handler";
import { spacing } from "@/constants/spacing";

export default function ThemeSetting() {
    return (
        <ScrollView
            style={style.wrapper}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={style.contentContainer}>
            <Mode />
            <Background />
        </ScrollView>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        flex: 1,
    },
    contentContainer: {
        paddingBottom: spacing.xxxl,
    },
});
