import ListEmpty from "@/components/base/listEmpty";
import ListFooter from "@/components/base/listFooter";
import { RequestStateCode } from "@/constants/commonConst";
import useOrientation from "@/hooks/useOrientation";
import rpx from "@/utils/rpx";
import { FlashList } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import React, { memo, useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import useSearch from "../../hooks/useSearch";
import { ISearchResult, queryAtom } from "../../store/atoms";
import { renderMap } from "./results";
import useColors from "@/hooks/useColors";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import SkeletonList from "@/components/base/skeleton";

interface IResultWrapperProps<
    T extends ICommon.SupportMediaType = ICommon.SupportMediaType,
> {
    tab: T;
    pluginHash: string;
    pluginName: string;
    searchResult: ISearchResult<T>;
    pluginSearchResultRef: React.MutableRefObject<ISearchResult<T>>;
}
function ResultWrapper(props: IResultWrapperProps) {
    const { tab, pluginHash, searchResult, pluginSearchResultRef } = props;
    const search = useSearch();
    const [searchState, setSearchState] = useState<RequestStateCode>(
        searchResult?.state ?? RequestStateCode.IDLE,
    );
    const orientation = useOrientation();
    const query = useAtomValue(queryAtom);
    const colors = useColors();

    const ResultComponent = renderMap[tab]!;
    const data: any = searchResult?.data ?? [];
    const isSheet = tab === "sheet";

    const keyExtractor = useCallback(
        (item: any, i: number) => `${i}-${item.platform}-${item.id}`,
        [],
    );

    useEffect(() => {
        if (searchState === RequestStateCode.IDLE) {
            search(query, 1, tab, pluginHash);
        }
    }, []);

    useEffect(() => {
        setSearchState(searchResult?.state ?? RequestStateCode.IDLE);
    }, [searchResult]);

    const renderItem = ({ item, index }: any) => {
        const content = (
            <ResultComponent
                item={item}
                index={index}
                pluginHash={pluginHash}
                pluginSearchResultRef={pluginSearchResultRef}
            />
        );

        if (isSheet) {
            return content;
        }

        return (
            <View
                style={[
                    styles.resultCard,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.divider,
                        shadowColor: colors.shadow,
                    },
                ]}>
                {content}
            </View>
        );
    };

    return searchState === RequestStateCode.PENDING_FIRST_PAGE ? (
        <SkeletonList count={7} />
    ) : (
        <FlashList
            extraData={searchState}
            ListEmptyComponent={<ListEmpty state={searchState} onRetry={() => {
                search(query, 1, tab, pluginHash);
            }} />}
            ListFooterComponent={data?.length ? <ListFooter state={searchState} onRetry={() => {
                search(query, undefined, tab, pluginHash);
            }} /> : null}
            ItemSeparatorComponent={isSheet ? undefined : Separator}
            contentContainerStyle={isSheet ? styles.sheetContent : styles.listContent}
            data={data}
            refreshing={false}
            onRefresh={() => {
                search(query, 1, tab, pluginHash);
            }}
            onEndReached={() => {
                (searchState === RequestStateCode.PARTLY_DONE ||
                    searchState === RequestStateCode.IDLE) &&
                    search(undefined, undefined, tab, pluginHash);
            }}
            estimatedItemSize={isSheet ? rpx(306) : rpx(134)}
            numColumns={
                isSheet ? (orientation === "vertical" ? 3 : 4) : 1
            }
            renderItem={renderItem}
            keyExtractor={keyExtractor}
        />
    );
}

export default memo(ResultWrapper);

function Separator() {
    return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
    listContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: rpx(180),
    },
    sheetContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: rpx(180),
    },
    resultCard: {
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 1,
    },
    separator: {
        height: spacing.sm,
    },
});
