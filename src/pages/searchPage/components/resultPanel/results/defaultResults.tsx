import React from "react";
import rpx from "@/utils/rpx";
import i18n from "@/core/i18n";
import Empty from "@/components/base/empty";

export default function DefaultResults() {
    return (
        <Empty
            icon="archive-box-x-mark"
            title={i18n.t("searchPage.comingSoon")}
            minHeight={rpx(420)}
        />
    );
}
