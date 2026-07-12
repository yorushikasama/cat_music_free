export default async function asyncFilterInBatches<T>(
    items: T[],
    predicate: (item: T) => Promise<boolean>,
    batchSize = 32,
) {
    const result: T[] = [];
    const safeBatchSize = Math.max(1, Math.floor(batchSize));
    for (let index = 0; index < items.length; index += safeBatchSize) {
        const batch = items.slice(index, index + safeBatchSize);
        const matches = await Promise.all(batch.map(predicate));
        batch.forEach((item, batchIndex) => {
            if (matches[batchIndex]) {
                result.push(item);
            }
        });
    }
    return result;
}
