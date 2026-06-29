import React from "react";
import { NativeScrollEvent, NativeSyntheticEvent, View } from "react-native";

import Header from "./header";
import MusicList from "@/components/musicList";
import Config from "@/core/appConfig";
import globalStyle from "@/constants/globalStyle";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import TrackPlayer from "@/core/trackPlayer";
import { RequestStateCode } from "@/constants/commonConst";
import SkeletonList from "@/components/base/skeleton";

interface IMusicListProps {
    sheetInfo: IMusic.IMusicSheetItem | null;
    musicList?: IMusic.IMusicItem[] | null;
    // 是否可收藏
    canStar?: boolean;
    // 状态
    state: RequestStateCode;
    onRetry?: () => void;
    onLoadMore?: () => void;
    onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}
export default function SheetMusicList(props: IMusicListProps) {
    const { sheetInfo, musicList, canStar, state, onRetry, onLoadMore, onScroll } = props;
    const resolvedMusicList = musicList ?? sheetInfo?.musicList;
    const isFirstLoading =
        !resolvedMusicList &&
        (
            state === RequestStateCode.IDLE ||
            state === RequestStateCode.PENDING_FIRST_PAGE ||
            state === RequestStateCode.PENDING_REST_PAGE
        );

    return (
        <View style={globalStyle.fwflex1}>
            {isFirstLoading ? (
                <SkeletonList count={7} />
            ) : (
                <HorizontalSafeAreaView style={globalStyle.fwflex1}>
                    <MusicList
                        showIndex
                        Header={
                            <Header
                                canStar={canStar}
                                musicSheet={sheetInfo}
                                musicList={resolvedMusicList ?? []}
                            />
                        }
                        onLoadMore={onLoadMore}
                        onRetry={onRetry}
                        onScroll={onScroll}
                        state={state}
                        musicList={resolvedMusicList ?? []}
                        onItemPress={(musicItem, currentMusicList) => {
                            if (
                                Config.getConfig(
                                    "basic.clickMusicInAlbum",
                                ) === "playMusic"
                            ) {
                                TrackPlayer.play(musicItem);
                            } else {
                                TrackPlayer.playWithReplacePlayList(
                                    musicItem,
                                    currentMusicList ?? [musicItem],
                                );
                            }
                        }}
                    />
                </HorizontalSafeAreaView>
            )}
        </View>
    );
}
