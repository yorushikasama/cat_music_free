import pathConst from "@/constants/pathConst";
import CryptoJs from "crypto-js";

interface ILocalLyricFileReader {
    exists(path: string): Promise<boolean>;
    readFile(path: string, encoding: "utf8"): Promise<string>;
}

function getLocalLyricBasePath(musicItem: ICommon.IMediaBase) {
    const platformHash = CryptoJs.MD5(musicItem.platform).toString(
        CryptoJs.enc.Hex,
    );
    const idHash = CryptoJs.MD5(musicItem.id).toString(CryptoJs.enc.Hex);
    return `${pathConst.localLrcPath}${platformHash}/${idHash}`;
}

export async function readLocalLyricFiles(
    musicItem: ICommon.IMediaBase,
    fileReader: ILocalLyricFileReader,
) {
    const basePath = getLocalLyricBasePath(musicItem);
    const rawLrcPath = `${basePath}.lrc`;
    const translationPath = `${basePath}.tran.lrc`;
    const [hasRawLrc, hasTranslation] = await Promise.all([
        fileReader.exists(rawLrcPath),
        fileReader.exists(translationPath),
    ]);
    const [rawLrc, translation] = await Promise.all([
        hasRawLrc ? fileReader.readFile(rawLrcPath, "utf8") : undefined,
        hasTranslation
            ? fileReader.readFile(translationPath, "utf8")
            : undefined,
    ]);

    return {
        rawLrc: rawLrc || undefined,
        translation: translation || undefined,
    };
}
