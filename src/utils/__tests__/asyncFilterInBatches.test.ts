import { describe, expect, it } from "@jest/globals";
import asyncFilterInBatches from "../asyncFilterInBatches";

describe("asyncFilterInBatches", () => {
    it("filters asynchronously while preserving order", async () => {
        const result = await asyncFilterInBatches(
            [1, 2, 3, 4, 5],
            async value => value % 2 === 1,
            2,
        );

        expect(result).toEqual([1, 3, 5]);
    });

    it("does not exceed the configured batch concurrency", async () => {
        let active = 0;
        let maxActive = 0;
        await asyncFilterInBatches(
            [1, 2, 3, 4, 5, 6],
            async () => {
                active += 1;
                maxActive = Math.max(maxActive, active);
                await Promise.resolve();
                active -= 1;
                return true;
            },
            2,
        );

        expect(maxActive).toBe(2);
    });
});
