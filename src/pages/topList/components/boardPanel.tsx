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
import useColors from "@/hooks/useColors";
import { radius } from "@/constants/borderRadius";

interface IBoardPanelProps {
    hash: string;
    topListData: IPluginTopListResult;
}
function BoardPanel(props: IBoardPanelProps) {
    const { hash, topListData } = props ?? {};
    const colors = useColors();
    const isLoading =
        !topListData ||
        topListData.state === RequestStateCode.PENDING_FIRST_PAGE ||
        topListData.state === RequestStateCode.PENDING_REST_PAGE;

    const renderItem: SectionListProps<IMusic.IMusicSheetItemBase>["renderItem"] =
        ({ item }) => {
            return <TopListItem topListItem={item} pluginHash={hash} />;
        };

    const renderSectionHeader: SectionListProps<IMusic.IMusicSheetItemBase>["renderSectionHeader"] =
        ({ section: { title, data } }) => {
            return (
                <View style={style.sectionHeader}>
                    <ThemeText
                        fontColor="textSecondary"
                        fontWeight="semibold"
                        fontSize="description">
                        {title}
                    </ThemeText>
                    <View
                        style={[
                            style.sectionCount,
                            {
                                backgroundColor: colors.controlBackground,
                                borderColor: colors.controlBorder ?? colors.divider,
                            },
                        ]}>
                        <ThemeText
                            fontSize="tag"
                            fontColor="textSecondary"
                            fontWeight="semibold">
                            {data.length}
                        </ThemeText>
                    </View>
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    sectionCount: {
        minWidth: rpx(40),
        height: rpx(34),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.xs,
        alignItems: "center",
        justifyContent: "center",
    },
});
