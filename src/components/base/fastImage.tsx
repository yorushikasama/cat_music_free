import React, { useEffect, useState } from "react";
import { ImageRequireSource } from "react-native";
import FastImage, { FastImageProps } from "react-native-fast-image";
import { errorLog } from "@/utils/log";

interface IFastImageProps {
    style?: FastImageProps["style"];
    defaultSource?: FastImageProps["defaultSource"];
    placeholderSource?: ImageRequireSource;
    source?: FastImageProps["source"] | string;
    resizeMode?: FastImageProps["resizeMode"];
}
export default function (props: IFastImageProps) {
    const { style, placeholderSource, defaultSource, source, resizeMode } = props ?? {};
    const [isError, setIsError] = useState(false);


    let realSource: FastImageProps["source"];
    if (typeof source === "string") {
        realSource = { uri: source };
        if (source.length === 0) {
            realSource = placeholderSource;
        }
    } else if (source){
        realSource = source;
    } else {
        realSource = placeholderSource;
    }


    useEffect(() => {
        setIsError(false);
    }, [source]);


    return (
        <FastImage
            style={style}
            source={isError ? placeholderSource : realSource}
            resizeMode={resizeMode ?? FastImage.resizeMode.cover}
            onError={() => {
                setIsError(true);
                errorLog("封面图加载失败", realSource);
            }}
            defaultSource={defaultSource}
        />
    );
}
