import PlayAllBar from "@/components/base/playAllBar";
import MediaDetailHeader from "@/components/mediaDetailHeader";
import { ImgAsset } from "@/constants/assetsConst";
import { useI18N } from "@/core/i18n";
import MusicSheet, { useSheetItem } from "@/core/musicSheet";
import { useParams } from "@/core/router";
import { getSheetCover } from "@/utils/mediaUtils";
import React from "react";

export default function Header() {
    const { id = "favorite" } = useParams<"local-sheet-detail">();
    const sheet = useSheetItem(id);
    const { t } = useI18N();
    const isDefaultSheet = id === MusicSheet.defaultSheet.id;

    return (
        <MediaDetailHeader
            cover={
                getSheetCover(sheet) ??
                (isDefaultSheet ? ImgAsset.favoriteDefault : undefined)
            }
            title={sheet?.title}
            subtitle={t("sheetDetail.totalMusicCount", {
                count: sheet?.musicList?.length ?? 0,
            })}
            platform={sheet?.platform}
            description={sheet?.description}
            footer={<PlayAllBar musicList={sheet?.musicList} musicSheet={sheet} />}
        />
    );
}
