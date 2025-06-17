export const deduplicateObjectArray = <T>(array: T[], idKey: string): T[] => {
  return Object.values(
    array.reduce((acc: Record<string, T>, item: T) => {
      const key = item[idKey as keyof T] as string;
      acc[key] = item;
      return acc;
    }, {} as Record<string, T>)
  );
};
