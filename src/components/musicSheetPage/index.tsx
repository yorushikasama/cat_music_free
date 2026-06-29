import React, { useCallback, useMemo, useState } from "react";
import NavBar from "./components/navBar";
import SheetMusicList from "./components/sheetMusicList";
import { RequestStateCode } from "@/constants/commonConst";
import PageShell from "@/components/base/pageShell";
import CompactMediaAppBarTitle from "@/components/mediaDetailHeader/compactTitle";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";

interface IMusicSheetPageProps {
    navTitle: string;
    sheetInfo: ICommon.WithMusicList<IMusic.IMusicSheetItemBase> | null;
    musicList?: IMusic.IMusicItem[] | null;
    // 是否可收藏
    canStar?: boolean;
    // 状态
    state: RequestStateCode;
    onRetry?: () => void;
    onLoadMore?: () => void;
}

const COMPACT_TITLE_OFFSET = rpx(210);

export default function MusicSheetPage(props: IMusicSheetPageProps) {
    const { navTitle, sheetInfo, musicList, canStar, onLoadMore, onRetry, state } =
        props;
    const colors = useColors();
    const [compactTitleVisible, setCompactTitleVisible] = useState(false);
    const compactTitle = sheetInfo?.title ?? navTitle;
    const resolvedMusicList = useMemo(
        () => musicList ?? sheetInfo?.musicList ?? [],
        [musicList, sheetInfo?.musicList],
    );

    const handleScroll = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const nextVisible = event.nativeEvent.contentOffset.y > COMPACT_TITLE_OFFSET;
            setCompactTitleVisible(prev => (
                prev === nextVisible ? prev : nextVisible
            ));
        },
        [],
    );

    return (
        <PageShell
            appBar={(
                <NavBar
                    musicList={resolvedMusicList}
                    navTitle={navTitle}
                    titleComponent={(
                        <CompactMediaAppBarTitle
                            label={navTitle}
                            title={compactTitle}
                            visible={compactTitleVisible}
                            color={colors.text}
                        />
                    )}
                />
            )}
            horizontalEdges={[]}
            musicBar>
            <SheetMusicList
                canStar={canStar}
                sheetInfo={sheetInfo as any}
                musicList={musicList ?? sheetInfo?.musicList}
                state={state}
                onRetry={onRetry}
                onLoadMore={onLoadMore}
                onScroll={handleScroll}
            />
        </PageShell>
    );
}
