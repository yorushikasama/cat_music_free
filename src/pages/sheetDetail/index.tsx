import React, { useCallback, useState } from "react";
import NavBar from "./components/navBar";
import SheetMusicList from "./components/sheetMusicList";
import PageShell from "@/components/base/pageShell";
import CompactMediaAppBarTitle from "@/components/mediaDetailHeader/compactTitle";
import { useI18N } from "@/core/i18n";
import { useParams } from "@/core/router";
import { useSheetItem } from "@/core/musicSheet";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";

const COMPACT_TITLE_OFFSET = rpx(210);

export default function SheetDetail() {
    const { id = "favorite" } = useParams<"local-sheet-detail">();
    const musicSheet = useSheetItem(id);
    const { t } = useI18N();
    const colors = useColors();
    const [compactTitleVisible, setCompactTitleVisible] = useState(false);

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
                    titleComponent={(
                        <CompactMediaAppBarTitle
                            label={t("common.sheet")}
                            title={musicSheet?.title ?? t("common.sheet")}
                            visible={compactTitleVisible}
                            color={colors.text}
                        />
                    )}
                />
            )}
            horizontalEdges={[]}
            musicBar>
            <SheetMusicList onScroll={handleScroll} />
        </PageShell>
    );
}
