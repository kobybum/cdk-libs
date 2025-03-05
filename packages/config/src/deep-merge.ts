/**
 * Deep merges two objects, with values from override taking precedence.
 * - Primitive values in override replace those in original
 * - If a value in override is undefined or null, the key will be undefined in result
 * - If both values are objects, they are recursively merged
 *
 * @param original The base object
 * @param override The object whose values take precedence
 * @returns A new merged object
 */
export function deepMerge<
    T extends Record<string, unknown> | Array<unknown>,
    U extends Record<string, unknown> | Array<unknown>,
>(original: T, override: U): Record<string, unknown> {
    // Create a new object to avoid mutating the inputs
    const result: Record<string, unknown> = {}

    // Start with all keys from original
    const allKeys = new Set([...Object.keys(original), ...Object.keys(override)])

    for (const key of allKeys) {
        // Check if key is intentionally set to undefined or null in override
        const hasKeyInOverride = Object.prototype.hasOwnProperty.call(override, key)
        const overrideValue = override[key as keyof U]

        if (hasKeyInOverride && (overrideValue === undefined || overrideValue === null)) {
            // Key explicitly set to undefined/null in override, preserve the value (undefined or null)
            result[key] = overrideValue
            continue
        }

        // If key is not in override, use original value
        if (!hasKeyInOverride) {
            result[key] = original[key as keyof T]
            continue
        }

        // Check if key exists in original
        const hasKeyInOriginal = Object.prototype.hasOwnProperty.call(original, key)

        // If key is not in original, use override value
        if (!hasKeyInOriginal) {
            result[key] = overrideValue
            continue
        }

        const originalValue = original[key as keyof T]

        // If both values are objects, recursively merge them
        if (
            typeof originalValue === 'object' &&
            originalValue !== null &&
            typeof overrideValue === 'object' &&
            overrideValue !== null &&
            !Array.isArray(originalValue) &&
            !Array.isArray(overrideValue)
        ) {
            result[key] = deepMerge(
                originalValue as Record<string, unknown>,
                overrideValue as Record<string, unknown>,
            )
        } else {
            // Otherwise, use the override value
            result[key] = overrideValue
        }
    }

    return result
}
