import React, { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import rpx, { vmax } from "@/utils/rpx";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PanelBase from "../base/panelBase";
import { hidePanel } from "../usePanel";
import ListItem from "@/components/base/listItem";
import PanelHeader from "../base/panelHeader";
import Icon, { IIconName } from "@/components/base/icon";
import useColors from "@/hooks/useColors";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";

interface ICandidateItem {
    title?: string;
    description?: string;
    icon?: IIconName;
    value: any;
}

interface ISimpleSelectProps {
    height?: number;
    header?: string;
    candidates?: Array<ICandidateItem>;
    onPress?: (item: ICandidateItem) => void;
}

export default function SimpleSelect(props: ISimpleSelectProps) {
    const {
        height,
        header = "",
        candidates = [],
        onPress,
    } = props ?? {};

    const safeAreaInsets = useSafeAreaInsets();
    const colors = useColors();
    const panelHeight = useMemo(() => {
        if (height) {
            return height;
        }
        const headerHeight = rpx(112);
        const itemHeight = rpx(104);
        const verticalPadding = spacing.sm + spacing.lg + safeAreaInsets.bottom;
        return Math.min(
            vmax(78),
            headerHeight + candidates.length * itemHeight + verticalPadding,
        );
    }, [candidates.length, height, safeAreaInsets.bottom]);

    return (
        <PanelBase
            height={panelHeight}
            renderBody={() => (
                <>
                    <PanelHeader title={header} hideButtons />

                    <ScrollView
                        style={styles.body}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                        contentContainerStyle={[
                            styles.bodyContent,
                            { paddingBottom: safeAreaInsets.bottom + spacing.xxl },
                        ]}>
                        {candidates.map((it, index) => {
                            return (
                                <ListItem
                                    key={`simple-select-${index}`}
                                    heightType={it.description ? "normal" : "small"}
                                    withHorizontalPadding
                                    style={[
                                        styles.option,
                                        {
                                            backgroundColor: colors.surfaceSecondary,
                                            borderColor: colors.divider,
                                        },
                                    ]}
                                    onPress={() => {
                                        onPress?.(it);
                                        hidePanel();
                                    }}>
                                    {it.icon ? (
                                        <ListItem.ListItemIcon
                                            icon={it.icon}
                                            color={colors.primary}
                                        />
                                    ) : null}
                                    <ListItem.Content
                                        title={it.title ?? it.value}
                                        description={it.description}
                                    />
                                    <Icon
                                        name="chevron-right"
                                        size={rpx(28)}
                                        color={colors.textSecondary}
                                    />
                                </ListItem>
                            );
                        })}
                    </ScrollView>
                </>
            )}
        />
    );
}

const styles = StyleSheet.create({
    header: {
        width: "100%",
        flexDirection: "row",
        padding: rpx(24),
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
    },
    option: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
        marginBottom: spacing.sm,
        overflow: "hidden",
    },
    item: {
        height: rpx(96),
        justifyContent: "center",
    },
});
