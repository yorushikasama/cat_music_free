import React from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import deviceInfoModule from "react-native-device-info";
import Color from "color";

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

export default function AboutSetting() {
    const checkAndShowResult = useCheckUpdate(false);
    const orientation = useOrientation();
    const colors = useColors();
    const appName = deviceInfoModule.getApplicationName();
    const version = deviceInfoModule.getVersion();
    const buildNumber = deviceInfoModule.getBuildNumber();
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
                <TouchableOpacity
                    activeOpacity={0.78}
                    onPress={() => {
                        checkAndShowResult(true);
                    }}>
                    <View
                        style={[
                            style.logoFrame,
                            {
                                backgroundColor: primaryTint,
                            },
                        ]}>
                        <Image
                            source={ImgAsset.logo}
                            style={style.logo}
                            resizeMode="contain"
                        />
                    </View>
                </TouchableOpacity>
                <ThemeText
                    fontSize="title"
                    fontWeight="bold"
                    numberOfLines={2}
                    style={style.appName}>
                    {appName}
                </ThemeText>
                <ThemeText fontSize="subTitle" fontColor="textSecondary">
                    当前版本 {version} · Build {buildNumber}
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
                <ThemeText
                    fontSize="description"
                    fontColor="textSecondary"
                    lineHeight
                    style={style.heroHint}>
                    点击图标可手动检查更新
                </ThemeText>
            </View>

            <ScrollView
                style={style.scrollView}
                contentContainerStyle={style.scrollViewContainer}
                showsVerticalScrollIndicator={false}>
                <Section title="当前版本">
                    <Paragraph>
                        这是 CatMusicFree 的当前维护分支，基于原开源项目继续开发，主要面向 Android
                        端的日常听歌、搜索、歌单、本地音乐、下载、歌词和插件管理场景。
                    </Paragraph>
                    <Paragraph>
                        当前版本重点完成了页面容器、顶部栏、搜索框、设置页、榜单、推荐歌单、播放详情、插件广场和弹层系统的统一，并加入播放失败后的有限自动换源逻辑。
                    </Paragraph>
                </Section>

                <Section title="本版本仓库">
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
                        应用内检查更新会优先读取 Gitee，并保留 GitHub Raw 与 jsDelivr
                        作为备用更新源。
                    </Paragraph>
                </Section>

                <Section title="原作者与上游项目">
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
                                本版本是在原项目基础上的二次开发与界面改造，请在二次分发或修改版本中保留原作者和上游项目出处。
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
                        本项目遵循 AGPL-3.0 协议。你可以学习、修改和分发代码，但二次分发版本也需要保持开源，并清楚标注修改内容、当前分支来源和原项目来源。
                    </Paragraph>
                    <Paragraph>
                        本版本不代表原作者官方发布版本；如果你需要确认上游项目动态，请以前面的原作者仓库为准。
                    </Paragraph>
                </Section>

                <Section title="插件与内容说明">
                    <Paragraph>
                        应用本身不内置音乐资源，搜索、播放、下载等能力主要依赖用户自行安装的插件。请只安装可信来源的插件，并合理合法使用。
                    </Paragraph>
                    <Paragraph>
                        第三方插件及其产生的数据与应用本体相互独立，由插件来源和使用者自行判断风险。
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
    logoFrame: {
        width: rpx(132),
        height: rpx(132),
        borderRadius: radius.xl,
        alignItems: "center",
        justifyContent: "center",
    },
    logo: {
        width: rpx(92),
        height: rpx(92),
    },
    appName: {
        marginTop: spacing.md,
        marginBottom: spacing.xs,
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
    heroHint: {
        marginTop: spacing.xs,
        textAlign: "center",
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
