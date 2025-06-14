// Converts snake_case string to camelCase at the type level
export type SnakeToCamelCase<S extends string> =
  S extends `${infer T}_${infer U}`
    ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
    : S;

// Recursively applies SnakeToCamelCase to all keys in an object type
export type KeysToCamelCase<T> = {
  [K in keyof T as SnakeToCamelCase<K & string>]: T[K] extends object
    ? KeysToCamelCase<T[K]>
    : T[K];
};
