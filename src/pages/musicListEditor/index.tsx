import AppBar from "@/components/base/appBar";
import i18n from "@/core/i18n";
import { useParams } from "@/core/router";
import { useSetAtom } from "jotai";
import React, { useEffect } from "react";
import Body from "./components/body";
import Bottom from "./components/bottom";
import { editingMusicListAtom, musicListChangedAtom } from "./store/atom";
import PageShell from "@/components/base/pageShell";

export default function MusicListEditor() {
    const { musicSheet, musicList } = useParams<"music-list-editor">();

    const setEditingMusicList = useSetAtom(editingMusicListAtom);
    const setMusicListChanged = useSetAtom(musicListChangedAtom);

    useEffect(() => {
        setEditingMusicList(
            (musicList ?? []).map(_ => ({ musicItem: _, checked: false })),
        );
        return () => {
            setEditingMusicList([]);
            setMusicListChanged(false);
        };
    }, []);

    return (
        <PageShell
            appBar={<AppBar>{musicSheet?.title ?? i18n.t("common.sheet")}</AppBar>}
            bottom={<Bottom />}>
            <Body />
        </PageShell>
    );
}
