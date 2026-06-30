import React from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import deviceInfoModule from "react-native-device-info";
import Color from "color";

import { Button } from "@/components/base/button";
import Icon from "@/components/base/icon";
import LinkText from "@/components/base/linkText";
import ThemeText from "@/components/base/themeText";
import { ImgAsset } from "@/constants/assetsConst";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import useColors from "@/hooks/useColors";
import useCheckUpdate from "@/hooks/useCheckUpdate.ts";
import useOrientation from "@/hooks/useOrientation";
import rpx from "@/utils/rpx";

const CURRENT_GITHUB = "https://github.com/yorushikasama/cat_music_free";
const CURRENT_GITEE = "https://gitee.com/qianmeng_a/cat_music_free";
const UPSTREAM_MUSICFREE = "https://github.com/maotoumao/MusicFree";
const UPSTREAM_CATMUSICFREE = "https://github.com/maotoumao/CatMusicFree";
const ORIGINAL_BILIBILI = "https://space.bilibili.com/12866223";

interface ISectionProps {
    title: string;
    children: React.ReactNode;
}

interface IInfoRowProps {
    label: string;
    children: React.ReactNode;
}

function Section(props: ISectionProps) {
    const colors = useColors();

    return (
        <View
            style={[
                style.section,
                {
                    backgroundColor: colors.surfacePrimary,
                    borderColor: colors.divider,
                },
            ]}>
            <ThemeText
                fontSize="subTitle"
                fontWeight="bold"
                style={style.sectionTitle}>
                {props.title}
            </ThemeText>
            {props.children}
        </View>
    );
}

function Paragraph(props: { children: React.ReactNode }) {
    return (
        <ThemeText
            fontSize="content"
            lineHeight
            style={style.paragraph}>
            {props.children}
        </ThemeText>
    );
}

function InfoRow(props: IInfoRowProps) {
    return (
        <View style={style.infoRow}>
            <ThemeText
                fontSize="description"
                fontWeight="semibold"
                fontColor="textSecondary"
                style={style.infoLabel}>
                {props.label}
            </ThemeText>
            <View style={style.infoContent}>{props.children}</View>
        </View>
    );
}

function BrandMark() {
    const colors = useColors();
    const primaryTint = Color(colors.primary).alpha(0.12).rgb().string();
    const primarySoft = Color(colors.primary).alpha(0.18).rgb().string();

    return (
        <View
            style={[
                style.brandMark,
                {
                    backgroundColor: primaryTint,
                    borderColor: primarySoft,
                },
            ]}>
            <Icon
                name="musical-note"
                size={rpx(34)}
                color={colors.primary}
                style={style.brandIcon}
            />
            <ThemeText
                fontSize="title"
                fontWeight="bold"
                color={colors.primary}
                style={style.brandLetters}>
                CM
            </ThemeText>
        </View>
    );
}

export default function AboutSetting() {
    const checkAndShowResult = useCheckUpdate(false);
    const orientation = useOrientation();
    const colors = useColors();
    const appName = deviceInfoModule.getApplicationName();
    const version = deviceInfoModule.getVersion();
    const primaryTint = Color(colors.primary).alpha(0.12).rgb().string();

    return (
        <View
            style={[
                style.wrapper,
                orientation === "horizontal" ? style.horizontalWrapper : null,
            ]}>
            <View
                style={[
                    style.hero,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.divider,
                    },
                    orientation === "horizontal" ? style.horizontalHero : null,
                ]}>
                <BrandMark />
                <ThemeText
                    fontSize="title"
                    fontWeight="bold"
                    numberOfLines={2}
                    style={style.appName}>
                    {appName}
                </ThemeText>
                <ThemeText fontSize="subTitle" fontColor="textSecondary">
                    当前版本 {version}
                </ThemeText>
                <ThemeText
                    fontSize="description"
                    fontColor="textSecondary"
                    lineHeight
                    style={style.heroDescription}>
                    一个插件化的 Android 音乐播放器，专注搜索、播放、歌单、本地音乐和歌词体验。
                </ThemeText>
                <View style={style.badgeRow}>
                    <View
                        style={[
                            style.badge,
                            {
                                backgroundColor: primaryTint,
                            },
                        ]}>
                        <ThemeText
                            fontSize="description"
                            fontWeight="semibold"
                            color={colors.primary}>
                            AGPL-3.0 开源
                        </ThemeText>
                    </View>
                    <View
                        style={[
                            style.badge,
                            {
                                backgroundColor: colors.surfaceSecondary,
                            },
                        ]}>
                        <ThemeText
                            fontSize="description"
                            fontWeight="semibold"
                            fontColor="textSecondary">
                            Android 版本
                        </ThemeText>
                    </View>
                </View>
                <Button
                    type="outline"
                    size="small"
                    text="检查更新"
                    style={style.updateButton}
                    onPress={() => {
                        checkAndShowResult(true);
                    }}
                />
            </View>

            <ScrollView
                style={style.scrollView}
                contentContainerStyle={style.scrollViewContainer}
                showsVerticalScrollIndicator={false}>
                <Section title="版本亮点">
                    <Paragraph>
                        CatMusicFree 面向 Android 端的日常听歌场景，覆盖搜索、播放、歌单、本地音乐、下载、歌词和插件管理。
                    </Paragraph>
                    <Paragraph>
                        当前版本优化了页面层级、顶部栏、搜索框、设置页、榜单、推荐歌单、播放详情、插件广场和弹层样式；当收藏歌曲来源失效时，也会尝试在可用范围内自动切换播放源。
                    </Paragraph>
                </Section>

                <Section title="项目仓库">
                    <InfoRow label="GitHub">
                        <LinkText linkTo={CURRENT_GITHUB}>
                            yorushikasama/cat_music_free
                        </LinkText>
                    </InfoRow>
                    <InfoRow label="Gitee">
                        <LinkText linkTo={CURRENT_GITEE}>
                            qianmeng_a/cat_music_free
                        </LinkText>
                    </InfoRow>
                    <Paragraph>
                        应用内检查更新会按内置线路获取版本信息，并提供可用的安装包下载地址。
                    </Paragraph>
                </Section>

                <Section title="开源与致谢">
                    <View style={style.authorBlock}>
                        <Image
                            source={ImgAsset.author}
                            style={style.authorImage}
                            resizeMode="cover"
                        />
                        <View style={style.authorText}>
                            <ThemeText
                                fontSize="content"
                                fontWeight="bold">
                                原作者：猫头猫
                            </ThemeText>
                            <ThemeText
                                fontSize="description"
                                fontColor="textSecondary"
                                lineHeight
                                style={style.authorDescription}>
                                感谢原作者和上游项目提供的开源基础。本应用延续其插件化音乐播放器思路，并在此基础上持续优化 Android 使用体验。
                            </ThemeText>
                        </View>
                    </View>
                    <InfoRow label="MusicFree">
                        <LinkText linkTo={UPSTREAM_MUSICFREE}>
                            maotoumao/MusicFree
                        </LinkText>
                    </InfoRow>
                    <InfoRow label="CatMusicFree">
                        <LinkText linkTo={UPSTREAM_CATMUSICFREE}>
                            maotoumao/CatMusicFree
                        </LinkText>
                    </InfoRow>
                    <InfoRow label="B站">
                        <LinkText linkTo={ORIGINAL_BILIBILI}>
                            不想睡觉猫头猫
                        </LinkText>
                    </InfoRow>
                    <InfoRow label="公众号">
                        <ThemeText fontSize="content">一只猫头猫</ThemeText>
                    </InfoRow>
                </Section>

                <Section title="开源协议">
                    <Paragraph>
                        本项目遵循 AGPL-3.0 协议。你可以学习、修改和分发代码；再次分发时，请继续遵守开源协议，并保留原作者、上游项目和当前项目的来源信息。
                    </Paragraph>
                </Section>

                <Section title="插件与内容说明">
                    <Paragraph>
                        应用本身不内置音乐资源，搜索、播放、下载等能力来自用户安装的插件。建议只安装可信来源的插件，并在合理合法的范围内使用。
                    </Paragraph>
                    <Paragraph>
                        插件广场和手动安装入口用于提升安装效率；第三方插件的内容、可用性和数据由对应来源提供。
                    </Paragraph>
                </Section>
            </ScrollView>
        </View>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        flex: 1,
    },
    horizontalWrapper: {
        flexDirection: "row",
    },
    hero: {
        marginHorizontal: spacing.md,
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
        borderRadius: radius.xl,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
    },
    horizontalHero: {
        width: rpx(520),
        marginBottom: spacing.lg,
        justifyContent: "center",
    },
    brandMark: {
        width: rpx(132),
        height: rpx(132),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    brandIcon: {
        position: "absolute",
        right: rpx(18),
        top: rpx(18),
        opacity: 0.36,
    },
    brandLetters: {
        letterSpacing: 0,
        lineHeight: rpx(50),
    },
    appName: {
        marginTop: spacing.md,
        marginBottom: spacing.xs,
        textAlign: "center",
    },
    heroDescription: {
        marginTop: spacing.sm,
        textAlign: "center",
    },
    badgeRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        marginTop: spacing.md,
    },
    badge: {
        height: rpx(44),
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: spacing.xs / 2,
        marginBottom: spacing.xs,
    },
    updateButton: {
        marginTop: spacing.sm,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContainer: {
        paddingBottom: rpx(96),
    },
    section: {
        marginHorizontal: spacing.md,
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
        borderWidth: StyleSheet.hairlineWidth,
    },
    sectionTitle: {
        marginBottom: spacing.sm,
    },
    paragraph: {
        marginTop: spacing.sm,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginTop: spacing.md,
    },
    infoLabel: {
        width: rpx(160),
        paddingTop: rpx(2),
    },
    infoContent: {
        flex: 1,
        flexShrink: 1,
    },
    authorBlock: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    authorImage: {
        width: rpx(92),
        height: rpx(92),
        borderRadius: radius.lg,
        marginRight: spacing.md,
    },
    authorText: {
        flex: 1,
    },
    authorDescription: {
        marginTop: spacing.xs,
    },
});
