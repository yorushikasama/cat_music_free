import React, { useState } from "react";
import { View } from "react-native";
import AlbumCover from "./albumCover";
import Lyric from "./lyric";
import useOrientation from "@/hooks/useOrientation";
import Config from "@/core/appConfig";
import globalStyle from "@/constants/globalStyle";

interface IContentProps {
    translatingLyric: boolean;
    setTranslatingLyric: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Content(props: IContentProps) {
    const { translatingLyric, setTranslatingLyric } = props;
    const [tab, selectTab] = useState<"album" | "lyric">(
        Config.getConfig("basic.musicDetailDefault") || "album",
    );
    const orientation = useOrientation();
    const showAlbumCover = tab === "album" || orientation === "horizontal";

    const onTurnPageClick = () => {
        if (orientation === "horizontal") {
            return;
        }
        if (tab === "album") {
            selectTab("lyric");
        } else {
            selectTab("album");
        }
    };

    return (
        <View style={globalStyle.fwflex1}>
            {showAlbumCover ? (
                <AlbumCover onTurnPageClick={onTurnPageClick} />
            ) : (
                <Lyric
                    onTurnPageClick={onTurnPageClick}
                    translating={translatingLyric}
                    setTranslating={setTranslatingLyric}
                />
            )}
        </View>
    );
}
