import { createChatCompletion } from "./client";

interface ISourceLine {
    lineIndex: number;
    timestamp: string;
    sourceText: string;
    translationId: number;
}

interface ITranslationItem {
    id: number;
    text: string;
    translated?: boolean;
    sourceLanguage?: string;
}

export interface ILyricTranslationResult {
    lrc: string;
    translatedLineCount: number;
    sourceLanguages: string[];
}

const TIMED_LYRIC_PATTERN = /^((?:\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\])+)(.*)$/;
const TRANSLATION_BATCH_SIZE = 40;

function parseResponseJson(content: string): ITranslationItem[] {
    const normalized = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    const parsed = JSON.parse(normalized);
    const translations = Array.isArray(parsed) ? parsed : parsed?.translations;
    if (!Array.isArray(translations)) {
        throw new Error("AI 翻译结果格式无效");
    }

    return translations
        .filter(item => Number.isInteger(item?.id) && typeof item?.text === "string")
        .map(item => ({
            id: item.id,
            text: item.text.trim(),
            translated: item.translated === true,
            sourceLanguage:
                typeof item.sourceLanguage === "string"
                    ? item.sourceLanguage.trim()
                    : undefined,
        }));
}

export function resolveLyricTargetLanguage(
    configuredTargetLanguage: string | undefined,
    appLocale: string,
) {
    const configured = configuredTargetLanguage?.trim();
    if (configured && configured.toLowerCase() !== "auto") {
        return configured;
    }

    const languageByLocale: Record<string, string> = {
        "zh-CN": "简体中文",
        "zh-TW": "繁体中文",
        "en-US": "English",
    };
    return languageByLocale[appLocale] ?? appLocale;
}

export function collectTimedLyricLines(rawLrc: string) {
    const uniqueTextIds = new Map<string, number>();
    const uniqueTexts: ITranslationItem[] = [];
    const sourceLines: ISourceLine[] = [];

    rawLrc.split(/\r?\n/).forEach((line, lineIndex) => {
        const match = line.match(TIMED_LYRIC_PATTERN);
        const sourceText = match?.[2]?.trim();
        if (!match || !sourceText) {
            return;
        }

        let translationId = uniqueTextIds.get(sourceText);
        if (translationId == null) {
            translationId = uniqueTexts.length;
            uniqueTextIds.set(sourceText, translationId);
            uniqueTexts.push({ id: translationId, text: sourceText });
        }

        sourceLines.push({
            lineIndex,
            timestamp: match[1],
            sourceText,
            translationId,
        });
    });

    return { sourceLines, uniqueTexts };
}

export function rebuildTranslationLrc(
    sourceLines: ISourceLine[],
    translations: ITranslationItem[],
) {
    const translationMap = new Map(
        translations.map(item => [item.id, item.text] as const),
    );

    return sourceLines
        .sort((a, b) => a.lineIndex - b.lineIndex)
        .map(line => {
            const translated = translationMap.get(line.translationId);
            return translated ? `${line.timestamp}${translated}` : "";
        })
        .filter(Boolean)
        .join("\n");
}

async function translateBatch(
    items: ITranslationItem[],
    targetLanguage: string,
) {
    const response = await createChatCompletion(
        [
            {
                role: "system",
                content:
                    "You translate song lyrics line by line. Detect the language of each line. " +
                    "If a line is already primarily in the target language, return it unchanged with translated=false. " +
                    "For mixed-language lines, preserve target-language words and proper names when natural, and translate the remaining meaning. " +
                    "Preserve tone, imagery, and repeated phrases. Return strict JSON only in the form " +
                    "{\"translations\":[{\"id\":0,\"text\":\"...\",\"translated\":true,\"sourceLanguage\":\"English\"}]}. " +
                    "Return every input id exactly once. Do not include timestamps, markdown, explanations, or extra keys.",
            },
            {
                role: "user",
                content: JSON.stringify({
                    targetLanguage,
                    lyrics: items,
                }),
            },
        ],
        { temperature: 0.2 },
    );
    const translations = parseResponseJson(response);
    const expectedIds = new Set(items.map(item => item.id));
    const returnedIds = translations.map(item => item.id);
    if (
        returnedIds.length !== expectedIds.size ||
        new Set(returnedIds).size !== returnedIds.length ||
        returnedIds.some(id => !expectedIds.has(id))
    ) {
        throw new Error("AI 未返回完整歌词翻译");
    }
    return translations;
}

export async function translateLyric(
    rawLrc: string,
    targetLanguage = "简体中文",
): Promise<ILyricTranslationResult> {
    const { sourceLines, uniqueTexts } = collectTimedLyricLines(rawLrc);
    if (!sourceLines.length) {
        throw new Error("当前歌词没有可翻译的时间轴内容");
    }

    const translations: ITranslationItem[] = [];
    for (let index = 0; index < uniqueTexts.length; index += TRANSLATION_BATCH_SIZE) {
        const batch = uniqueTexts.slice(index, index + TRANSLATION_BATCH_SIZE);
        const translatedBatch = await translateBatch(batch, targetLanguage);
        translations.push(...translatedBatch);
    }

    const translatedIds = new Set(
        translations.filter(item => item.translated).map(item => item.id),
    );
    const sourceLanguages = Array.from(
        new Set(
            translations
                .map(item => item.sourceLanguage)
                .filter((item): item is string => !!item),
        ),
    );

    return {
        lrc: rebuildTranslationLrc(sourceLines, translations),
        translatedLineCount: sourceLines.filter(line =>
            translatedIds.has(line.translationId),
        ).length,
        sourceLanguages,
    };
}
