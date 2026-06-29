import React from "react";
import { StyleSheet } from "react-native";
import AppBar from "@/components/base/appBar";
import PageShell from "@/components/base/pageShell";
import Button from "@/components/base/textButton.tsx";
import Body from "./body";
import { useNavigation } from "@react-navigation/native";
import { useI18N } from "@/core/i18n";

export default function SetCustomTheme() {
    const navigation = useNavigation();
    const { t } = useI18N();

    return (
        <PageShell
            appBar={(
                <AppBar
                    actionComponent={(
                    <Button
                        style={styles.submit}
                        onPress={() => {
                            navigation.goBack();
                        }}
                        fontColor="appBarText">
                        {t("common.done")}
                    </Button>
                    )}>
                    {t("setCustomTheme.customizeBackground")}
                </AppBar>
            )}>
            <Body />
        </PageShell>
    );
}

const styles = StyleSheet.create({
    submit: {
        justifyContent: "center",
    },
});
