import React from "react";
import { StyleSheet, View } from "react-native";
import rpx, { vmax } from "@/utils/rpx";
import { hidePanel } from "@/components/panels/usePanel.ts";
import { FlashList } from "@shopify/flash-list";
import FastImage from "@/components/base/fastImage";
import { ImgAsset } from "@/constants/assetsConst.ts";
import ThemeText from "@/components/base/themeText.tsx";
import Comment from "@/components/panels/types/musicComment/comment.tsx";
import useComments from "@/components/panels/types/musicComment/useComments.ts";
import { RequestStateCode } from "@/constants/commonConst.ts";
import { useI18N } from "@/core/i18n";
import ListEmpty from "@/components/base/listEmpty";
import ListFooter from "@/components/base/listFooter";
import PanelBase from "@/components/panels/base/panelBase";
import PanelHeader from "@/components/panels/base/panelHeader";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import useColors from "@/hooks/useColors";

interface IMusicCommentProps {
    musicItem: IMusic.IMusicItem;
}


export default function MusicComment(props: IMusicCommentProps) {
    const { musicItem } = props;

    const [reqState, comments, getMusicComments] = useComments(musicItem);
    const { t } = useI18N();
    const colors = useColors();


    const listBody = <FlashList
        contentContainerStyle={styles.listContent}
        ListFooterComponent={comments?.length ? <ListFooter state={reqState} onRetry={getMusicComments} /> : null}
        ListEmptyComponent={<ListEmpty state={reqState} onRetry={getMusicComments} />}
        estimatedItemSize={100}
        renderItem={({ item }) => {
            return <Comment comment={item} />;
        }}
        onEndReachedThreshold={0.1}
        onEndReached={() => {
            if (reqState === RequestStateCode.IDLE || reqState === RequestStateCode.PARTLY_DONE) {
                getMusicComments();
            }
        }}
        data={comments}
    />;

    return (
        <PanelBase
            height={vmax(78)}
            renderBody={() => (
                <>
                    <PanelHeader
                        title={t("common.comment")}
                        hideButtons
                        onCancel={hidePanel}
                    />
                    <View style={styles.body}>
                        <View
                            style={[
                                styles.musicItemContainer,
                                {
                                    backgroundColor: colors.surfaceSecondary,
                                    borderColor: colors.divider,
                                },
                            ]}>
                            <FastImage
                                style={styles.musicItemArtwork}
                                source={musicItem?.artwork}
                                placeholderSource={ImgAsset.albumDefault}
                            />
                            <View style={styles.musicItemContent}>
                                <ThemeText
                                    fontSize="subTitle"
                                    fontWeight="semibold"
                                    numberOfLines={1}>
                                    {musicItem.title}
                                </ThemeText>
                                <ThemeText
                                    fontSize="description"
                                    numberOfLines={1}
                                    fontColor="textSecondary"
                                    style={styles.musicArtist}>
                                    {musicItem.artist}
                                </ThemeText>
                            </View>
                        </View>
                        {listBody}
                    </View>
                </>
            )}
        />
    );
}

const styles = StyleSheet.create({
    body: {
        flex: 1,
    },
    musicItemContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.xl,
        borderWidth: StyleSheet.hairlineWidth,
    },
    musicItemArtwork: {
        width: rpx(88),
        height: rpx(88),
        borderRadius: radius.lg,
        overflow: "hidden",
        marginRight: spacing.md,
    },
    musicItemContent: {
        flex: 1,
        justifyContent: "center",
    },
    musicArtist: {
        marginTop: spacing.xs,
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xl,
    },
});
