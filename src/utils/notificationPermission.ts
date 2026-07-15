import { PermissionsAndroid, Platform } from "react-native";

export async function hasNotificationPermission() {
    if (Platform.OS !== "android" || Number(Platform.Version) < 33) {
        return true;
    }
    return PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
}

export async function requestNotificationPermission() {
    if (await hasNotificationPermission()) return true;
    const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
}
