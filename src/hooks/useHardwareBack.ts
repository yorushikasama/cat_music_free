import { useEffect, useRef } from "react";
import { BackHandler, NativeEventSubscription } from "react-native";

export default function (
    onHardwareBackPress: () => boolean | null | undefined,
    _deps: any[] = [],
) {
    const backHandlerRef = useRef<NativeEventSubscription | undefined>(undefined);
    const callbackRef = useRef(onHardwareBackPress);
    callbackRef.current = onHardwareBackPress;

    useEffect(() => {
        if (backHandlerRef.current) {
            backHandlerRef.current.remove();
            backHandlerRef.current = undefined;
        }

        backHandlerRef.current = BackHandler.addEventListener(
            "hardwareBackPress",
            () => callbackRef.current(),
        );

        return () => {
            if (backHandlerRef.current) {
                backHandlerRef.current.remove();
                backHandlerRef.current = undefined;
            }
        };
    }, []);
}
