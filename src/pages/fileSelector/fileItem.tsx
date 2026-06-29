import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import ThemeText from "@/components/base/themeText";
import Checkbox from "@/components/base/checkbox";
import { TouchableOpacity } from "react-native-gesture-handler";
import { iconSizeConst } from "@/constants/uiConst.ts";
import ListItem from "@/components/base/listItem";
import useColors from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import Color from "color";

interface IProps {
    type: "folder" | "file";
    path: string;
    parentPath: string;
    checked?: boolean;
    onItemPress: (currentChecked?: boolean) => void;
    onCheckedChange: (checked: boolean) => void;
}

function FileItem(props: IProps) {
    const {
        type,
        path,
        parentPath,
        checked,
        onItemPress,
        onCheckedChange: onCheckChange,
    } = props;

    const colors = useColors();
    const title = useMemo(
        () =>
            path.substring(parentPath === "/" ? 1 : parentPath.length + 1) ||
            path,
        [parentPath, path],
    );
    const description =
        type === "folder"
            ? path
            : path.substring(0, Math.max(path.lastIndexOf("/"), 0)) || path;
    const iconColor = checked ? colors.primary : colors.textSecondary;

    return (
        <ListItem
            heightType="small"
            withHorizontalPadding
            style={[
                styles.container,
                checked
                    ? {
                          backgroundColor: Color(colors.primary)
                              .alpha(0.08)
                              .rgb()
                              .string(),
                      }
                    : null,
            ]}
            onPress={() => {
                onItemPress(checked);
            }}>
            <ListItem.ListItemIcon
                icon={type === "folder" ? "folder-outline" : "musical-note"}
                iconSize={iconSizeConst.light}
                color={iconColor}
                containerStyle={[
                    styles.fileIcon,
                    {
                        backgroundColor: Color(iconColor)
                            .alpha(0.1)
                            .rgb()
                            .string(),
                        borderColor: Color(iconColor)
                            .alpha(0.16)
                            .rgb()
                            .string(),
                    },
                ]}
            />
            <View style={styles.pathWrapper}>
                <ThemeText
                    fontWeight={checked ? "semibold" : "regular"}
                    color={checked ? colors.primary : colors.text}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {title}
                </ThemeText>
                <ThemeText
                    fontSize="description"
                    fontColor="textSecondary"
                    numberOfLines={1}
                    ellipsizeMode="head"
                    style={styles.pathDescription}>
                    {description}
                </ThemeText>
            </View>
            <TouchableOpacity
                onPress={() => {
                    onCheckChange(!checked);
                }}
                style={styles.checkIcon}>
                <Checkbox checked={checked} />
            </TouchableOpacity>
        </ListItem>
    );
}

export default memo(
    FileItem,
    (prev, curr) =>
        prev.checked === curr.checked &&
        prev.parentPath === curr.parentPath &&
        prev.path === curr.path,
);

const styles = StyleSheet.create({
    container: {
        width: "100%",
        borderRadius: radius.lg,
    },
    fileIcon: {
        width: rpx(64),
        height: rpx(64),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        marginRight: spacing.md,
    },
    pathWrapper: {
        flex: 1,
        justifyContent: "center",
        minWidth: 0,
    },
    pathDescription: {
        marginTop: spacing.xs,
    },
    checkIcon: {
        padding: rpx(14),
        marginLeft: spacing.sm,
    },
});
