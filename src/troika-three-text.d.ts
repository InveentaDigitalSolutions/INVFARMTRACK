/**
 * troika-three-text ships no types. Only the one function we call is declared;
 * drei re-exports the Text component with its own types.
 */
declare module "troika-three-text" {
  export function configureTextBuilder(options: { useWorker?: boolean }): void;
}
