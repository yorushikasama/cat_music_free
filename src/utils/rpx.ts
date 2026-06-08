import { Dimensions } from "react-native";

let windowWidth = Dimensions.get("window").width;
let windowHeight = Dimensions.get("window").height;
let minWindowEdge = Math.min(windowHeight, windowWidth);
let maxWindowEdge = Math.max(windowHeight, windowWidth);

Dimensions.addEventListener("change", ({ window }) => {
    windowWidth = window.width;
    windowHeight = window.height;
    minWindowEdge = Math.min(windowHeight, windowWidth);
    maxWindowEdge = Math.max(windowHeight, windowWidth);
});

export default function (rpx: number) {
    return (rpx / 750) * minWindowEdge;
}

export function vh(pct: number) {
    return (pct / 100) * windowHeight;
}

export function vw(pct: number) {
    return (pct / 100) * windowWidth;
}

export function vmin(pct: number) {
    return (pct / 100) * minWindowEdge;
}

export function vmax(pct: number) {
    return (pct / 100) * maxWindowEdge;
}

export function sh(pct: number) {
    return (pct / 100) * Dimensions.get("screen").height;
}

export function sw(pct: number) {
    return (pct / 100) * Dimensions.get("screen").width;
}