import React from "react";
import { StatusBar, StatusBarProps, StyleSheet, View } from "react-native";
import useColors from "@/hooks/useColors";

interface IStatusBarProps extends StatusBarProps {}

export default function (props: IStatusBarProps) {
    const colors = useColors();
    const { backgroundColor, barStyle } = props;
    const statusBarStyle = {
        backgroundColor: backgroundColor ?? colors.appBar ?? colors.primary,
        height: StatusBar.currentHeight,
    };

    return (
        <>
            <StatusBar
                backgroundColor={"rgba(0,0,0,0)"}
                barStyle={barStyle ?? "light-content"}
            />
            <View
                style={[styles.statusBar, statusBarStyle]}
            />
        </>
    );
}

const styles = StyleSheet.create({
    statusBar: {
        zIndex: 10000,
        position: "absolute",
        top: 0,
        width: "100%",
    },
});
