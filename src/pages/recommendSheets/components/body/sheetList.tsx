import React, { memo, useCallback } from "react";
import { StyleSheet } from "react-native";
import rpx from "@/utils/rpx";
import { FlashList } from "@shopify/flash-list";
import useRecommendSheets from "../../hooks/useRecommendSheets";
import SheetItem from "@/components/mediaItem/sheetItem";
import useOrientation from "@/hooks/useOrientation";
import ListEmpty from "@/components/base/listEmpty";
import ListFooter from "@/components/base/listFooter";
import { RequestStateCode } from "@/constants/commonConst";
import { SkeletonGrid } from "@/components/base/skeleton";
import { spacing } from "@/constants/spacing";

interface ISheetListProps {
    tag: ICommon.IUnique;
    pluginHash: string;
}

function SheetList(props: ISheetListProps) {
    const { tag, pluginHash } = props ?? {};

    const [query, sheets, status] = useRecommendSheets(pluginHash, tag);

    function renderItem({ item }: { item: IMusic.IMusicSheetItemBase }) {
        return <SheetItem sheetInfo={item} pluginHash={pluginHash} />;
    }
    const orientation = useOrientation();

    const keyExtractor = useCallback(
        (item: any, i: number) => `${i}-${item.platform}-${item.id}`,
        [],
    );

    if (!sheets.length && status === RequestStateCode.PENDING_FIRST_PAGE) {
        return (
            <SkeletonGrid
                count={orientation === "vertical" ? 9 : 8}
                columns={orientation === "vertical" ? 3 : 4}
            />
        );
    }

    return (
        <FlashList
            ListEmptyComponent={<ListEmpty state={status} onRetry={query} />}
            ListFooterComponent={
                sheets.length ? <ListFooter
                    state={status}
                    onRetry={query}
                /> : null
            }
            onEndReached={() => {
                query();
            }}
            onEndReachedThreshold={0.1}
            estimatedItemSize={rpx(306)}
            numColumns={orientation === "vertical" ? 3 : 4}
            renderItem={renderItem}
            data={sheets}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
        />
    );
}

export default memo(
    SheetList,
    (prev, curr) =>
        prev.tag.id === curr.tag.id && prev.pluginHash === curr.pluginHash,
);

const styles = StyleSheet.create({
    listContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
});
