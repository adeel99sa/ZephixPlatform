// Nest 11 / multer 2.x: multer@2 ships NO TypeScript types (no `types` field),
// so `Express.Multer.File` still comes from @types/multer. Because the base
// tsconfig restricts auto-inclusion (`"types": ["node"]`), that global
// augmentation is not loaded automatically — this reference directive pulls it
// in. This replaces the old hand-rolled express-multer.d.ts, which additionally
// re-exported the multer module (`export import Multer = multer`); multer@2 has
// no module types, so that bridge resolved to nothing and is dropped. Keep this
// reference-only file until multer ships its own types (then delete).
/// <reference types="multer" />
