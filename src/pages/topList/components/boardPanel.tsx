import React, { memo } from "react";
import { SectionList, SectionListProps, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import { IPluginTopListResult } from "../store/atoms";
import { RequestStateCode } from "@/constants/commonConst";
import TopListItem from "@/components/mediaItem/topListItem";
import ThemeText from "@/components/base/themeText";
import ListEmpty from "@/components/base/listEmpty";
import SkeletonList from "@/components/base/skeleton";
import { spacing } from "@/constants/spacing";

interface IBoardPanelProps {
    hash: string;
    topListData: IPluginTopListResult;
}
function BoardPanel(props: IBoardPanelProps) {
    const { hash, topListData } = props ?? {};
    const isLoading =
        !topListData ||
        topListData.state === RequestStateCode.PENDING_FIRST_PAGE ||
        topListData.state === RequestStateCode.PENDING_REST_PAGE;

    const renderItem: SectionListProps<IMusic.IMusicSheetItemBase>["renderItem"] =
        ({ item }) => {
            return <TopListItem topListItem={item} pluginHash={hash} />;
        };

    const renderSectionHeader: SectionListProps<IMusic.IMusicSheetItemBase>["renderSectionHeader"] =
        ({ section: { title } }) => {
            return (
                <View style={style.sectionHeader}>
                    <ThemeText
                        fontWeight="semibold"
                        fontSize="subTitle">
                        {title}
                    </ThemeText>
                </View>
            );
        };

    return isLoading ? (
        <SkeletonList count={8} />
    ) : (
        <SectionList
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListEmptyComponent={<ListEmpty state={topListData?.state} />}
            sections={topListData?.data || []}
            contentContainerStyle={style.listContent}
        />
    );
}

export default memo(
    BoardPanel,
    (prev, curr) => prev.topListData === curr.topListData,
);

const style = StyleSheet.create({
    wrapper: {
        width: rpx(750),
    },
    listContent: {
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    sectionHeader: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
});
