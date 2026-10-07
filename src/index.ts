import { findByProps } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { logger } from "@vendetta";
import { React, ReactNative as RN } from "@vendetta/metro/common";
import { findInReactTree } from "@vendetta/utils";
import Settings from "./Settings";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const ActionSheet = findByProps("openLazy", "hideActionSheet");

// Collects the visible text of an ActionSheetRow so we can recognise Discord's Delete row
function rowText(row: any): string {
    const p = row?.props ?? {};
    return [p.label, p.message, p.text, typeof p.children === "string" ? p.children : ""]
        .filter((t): t is string => typeof t === "string")
        .join(" ")
        .toLowerCase();
}

const isDeleteRow = (row: any) =>
    typeof row?.props?.onPress === "function" && /delete|remove|удал/i.test(rowText(row));

async function silentDeleteMessage(channelId: string, messageId: string) {
    const RestAPI = findByProps("get", "post", "del", "patch");
    try {
        const replacementText: string = storage.replacementText ?? "** **";
        const deleteDelay: number = storage.deleteDelay ?? 200;
        const suppressNotifications: boolean = storage.suppressNotifications ?? true;

        const response = await RestAPI.post({
            url: `/channels/${channelId}/messages`,
            body: {
                content: replacementText,
                flags: suppressNotifications ? 4096 : 0,
                mobile_network_type: "unknown",
                nonce: messageId,
                tts: false,
            },
        });

        await sleep(deleteDelay);
        await RestAPI.del({ url: `/channels/${channelId}/messages/${response.body.id}` });
        await sleep(100);
        await RestAPI.del({ url: `/channels/${channelId}/messages/${messageId}` });
        logger.log("[SilentDelete] Success!");
        return true;
    } catch (err) {
        logger.log("[SilentDelete] Error: " + String(err));
        return false;
    }
}

let unpatchOpenLazy: (() => void) | null = null;

export default {
    onLoad() {
        storage.replacementText ??= "** **";
        storage.deleteDelay ??= 200;
        storage.suppressNotifications ??= true;

        unpatchOpenLazy = before("openLazy", ActionSheet, ([comp, args, msg]) => {
            if (args !== "MessageLongPressActionSheet" || !msg?.message) return;

            const UserStore = findByProps("getCurrentUser");
            const currentUser = UserStore?.getCurrentUser();
            if (!currentUser || msg.message.author?.id !== currentUser.id) return;

            const channelId: string = msg.message.channel_id;
            const messageId: string = msg.message.id;

            comp.then((instance: any) => {
                const unpatch = after("default", instance, (_: any, component: any) => {
                    // Self-cleaning patch — removed after sheet unmounts
                    React.useEffect(() => () => { unpatch(); }, []);

                    // Runs instead of Discord's normal delete flow
                    const silentPress = () => {
                        ActionSheet.hideActionSheet();
                        silentDeleteMessage(channelId, messageId);
                    };

                    // Find Discord's own Delete row and swap its handler for the silent one,
                    // keeping the original label/icon/appearance untouched
                    const groups: any[] | null = findInReactTree(
                        component,
                        (c: any) => Array.isArray(c) && c[0]?.type?.name === "ActionSheetRowGroup"
                    );

                    if (!groups?.length) {
                        logger.warn("[SilentDelete] Could not find ActionSheetRowGroups");
                        return;
                    }

                    let replaced = false;
                    for (const group of groups) {
                        const rows: any[] | null = findInReactTree(
                            group,
                            (c: any) => Array.isArray(c) && c.some(isDeleteRow)
                        );
                        if (!rows) continue;

                        const deleteRowIndex = rows.findIndex(isDeleteRow);
                        if (deleteRowIndex < 0) continue;

                        rows[deleteRowIndex] = React.cloneElement(rows[deleteRowIndex], {
                            onPress: silentPress,
                        });
                        replaced = true;
                        break;
                    }

                    if (!replaced) {
                        logger.warn("[SilentDelete] Discord Delete row not found, nothing replaced");
                    }
                });
            });
        });

        logger.log("[SilentDelete] Loaded.");
    },

    onUnload() {
        unpatchOpenLazy?.();
        unpatchOpenLazy = null;
        logger.log("[SilentDelete] Unloaded.");
    },

    settings: Settings,
};
