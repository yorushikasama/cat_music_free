import AppBar from "@/components/base/appBar";
import PageShell from "@/components/base/pageShell";
import SearchInput from "@/components/base/searchInput";
import { useI18N } from "@/core/i18n";
import { useParams } from "@/core/router";
import rpx from "@/utils/rpx";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import SearchResult from "./searchResult";

function filterMusic(query: string, musicList: IMusic.IMusicItem[]) {
    if (query?.length === 0) {
        return musicList;
    }
    const lowerQuery = query.toLowerCase();
    return musicList.filter(_ =>
        `${_.title} ${_.artist} ${_.album} ${_.platform}`
            .toLowerCase()
            .includes(lowerQuery),
    );
}

export default function SearchMusicList() {
    const { musicList, musicSheet } = useParams<"search-music-list">();
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { t } = useI18N();

    const result = useMemo(
        () => filterMusic(debouncedQuery.trim(), musicList ?? []),
        [debouncedQuery, musicList],
    );

    const onChangeSearch = useCallback((text: string) => {
        setQuery(text);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setDebouncedQuery(text);
        }, 200);
    }, []);

    return (
        <PageShell
            appBar={(
                <AppBar>
                    <SearchInput
                        containerStyle={style.searchBar}
                        placeholder={t("searchMusicList.searchPlaceHolder")}
                        accessible
                        autoFocus
                        accessibilityLabel={t("searchMusicList.searchLabel.a11y")}
                        accessibilityHint={t("searchMusicList.searchLabel.a11y")}
                        value={query}
                        onChangeText={onChangeSearch}
                        onClear={() => {
                            onChangeSearch("");
                        }}
                    />
                </AppBar>
            )}
            musicBar>
            <SearchResult
                result={result}
                total={musicList?.length ?? 0}
                query={debouncedQuery.trim()}
                musicSheet={musicSheet}
            />
        </PageShell>
    );
}

const style = StyleSheet.create({
    appbar: {
        shadowColor: "transparent",
        backgroundColor: "#2b333eaa",
    },
    searchBar: {
        minWidth: rpx(375),
        flex: 1,
        height: rpx(64),
    },
});
