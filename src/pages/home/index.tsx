import React from "react";
import { StyleSheet, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import StatusBar from "@/components/base/statusBar";
import globalStyle from "@/constants/globalStyle";
import Theme from "@/core/theme";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import BottomArea from "./components/bottomArea";
import Discover from "./components/discover";
import SheetsTab from "./components/sheetsTab";
import ProfileTab from "./components/profileTab";

const Tab = createBottomTabNavigator();

function HomeStatusBar() {
    const theme = Theme.useTheme();

    return (
        <StatusBar
            backgroundColor="transparent"
            barStyle={theme.dark ? undefined : "dark-content"}
        />
    );
}

function DiscoverScreen() {
    return (
        <View style={globalStyle.flex1}>
            <Discover />
        </View>
    );
}

function SheetsScreen() {
    return (
        <View style={globalStyle.flex1}>
            <SheetsTab />
        </View>
    );
}

function ProfileScreen() {
    return (
        <View style={globalStyle.flex1}>
            <ProfileTab />
        </View>
    );
}

export default function Home() {
    return (
        <SafeAreaView edges={["top"]} style={styles.appWrapper}>
            <HomeStatusBar />
            <Tab.Navigator
                tabBar={props => <BottomArea {...props} />}
                screenOptions={{
                    headerShown: false,
                }}>
                <Tab.Screen name="Discover" component={DiscoverScreen} />
                <Tab.Screen name="Sheets" component={SheetsScreen} />
                <Tab.Screen name="Profile" component={ProfileScreen} />
            </Tab.Navigator>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    appWrapper: {
        flexDirection: "column",
        flex: 1,
    },
});
