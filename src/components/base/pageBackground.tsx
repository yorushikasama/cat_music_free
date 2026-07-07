import React, { memo } from "react";
import ThemedBackgroundLayer from "./themedBackground";

function PageBackground() {
    return <ThemedBackgroundLayer />;
}

export default memo(PageBackground, () => true);
