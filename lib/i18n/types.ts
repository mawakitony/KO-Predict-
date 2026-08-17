export type MessageTree<T> = {
  [K in keyof T]: T[K] extends string ? string : MessageTree<T[K]>;
};
