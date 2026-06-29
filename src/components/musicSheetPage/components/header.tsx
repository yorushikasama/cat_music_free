import React from "react";
import PlayAllBar from "@/components/base/playAllBar";
import MediaDetailHeader from "@/components/mediaDetailHeader";
import { useI18N } from "@/core/i18n";

interface IHeaderProps {
    musicSheet: IMusic.IMusicSheetItem | null;
    musicList: IMusic.IMusicItem[] | null;
    canStar?: boolean;
}
export default function Header(props: IHeaderProps) {
    const { musicSheet, musicList, canStar } = props;
    const { t } = useI18N();
    const count = musicSheet?.worksNum ?? (musicList ? musicList.length ?? 0 : 0);

    return (
        <MediaDetailHeader
            cover={musicSheet?.artwork ?? musicSheet?.coverImg}
            title={musicSheet?.title}
            subtitle={t("sheetDetail.totalMusicCount", { count })}
            platform={musicSheet?.platform}
            description={musicSheet?.description}
            footer={(
                <PlayAllBar
                    canStar={canStar}
                    musicList={musicList}
                    musicSheet={musicSheet}
                />
            )}
        />
    );
}
