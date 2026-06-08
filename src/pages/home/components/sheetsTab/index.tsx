import React from "react";
import globalStyle from "@/constants/globalStyle";
import Sheets from "../homeBody/sheets";
import { View } from "react-native";

export default function SheetsTab() {
    return (
        <View style={globalStyle.fwflex1}>
            <Sheets />
        </View>
    );
}
