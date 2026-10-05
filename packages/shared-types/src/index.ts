// Public surface of the shared type contracts.
//
// Two sources, one barrel:
//   - `./generated/api`  — auto-generated from the FastAPI OpenAPI schema
//                          (run `pnpm gen:types`). The API is the source of truth.
//   - `./domain/*`       — the small set of constants/enums shared across the
//                          language boundary that are NOT derived from HTTP shapes.

export * from './domain';
export type { paths, components, operations } from './generated/api';
