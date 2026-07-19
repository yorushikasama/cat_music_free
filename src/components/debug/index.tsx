import React from "react";
import VDebug from "@/lib/react-native-vdebug";
import { useAppConfig } from "@/core/appConfig";

export default function Debug() {
    const showDebug = useAppConfig("debug.devLog");
    if (!showDebug) {
        return null;
    }

    return <VDebug pointerEvents="box-none" />;
}
