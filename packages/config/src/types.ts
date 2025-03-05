import { EnvId } from '@cdklib/config/types'
import { z } from 'zod'

/**
 * Helper type to extract path segments from a string type
 * For example: PathSegments<'a/b/c'> = 'a' | 'a/b' | 'a/b/c'
 */
export type PathSegments<T extends string> = T & T extends `${infer First}/${infer Rest}`
    ? First | `${First}/${PathSegments<Rest>}` | T
    : T

export type PartialDeep<T> =
    T extends Array<infer U>
        ? Array<PartialDeep<U>>
        : T extends ReadonlyArray<infer U>
          ? ReadonlyArray<PartialDeep<U>>
          : T extends Set<infer U>
            ? Set<PartialDeep<U>>
            : T extends Map<infer K, infer V>
              ? Map<K, PartialDeep<V>>
              : T extends Record<any, any>
                ? { [K in keyof T]?: PartialDeep<T[K]> }
                : T

export type Overrides = PartialDeep<Record<string, any>>

/**
 * Configuration merge function type
 *
 * Implement your own deep merge strategy
 */
export type ConfigMergeFn = (original: Overrides, override: Overrides) => Overrides

/**
 * A function that receives the environment ID and derived configuration, and returns a partial configuration.
 *
 * Runs last, after default / env overrides.
 */
export type RuntimeConfigFn<TSchema extends z.ZodObject<any>> = (
    envId: EnvId,
    config: z.infer<TSchema>,
) => PartialDeep<z.infer<TSchema>>
