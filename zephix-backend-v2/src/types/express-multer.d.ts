/// <reference types="multer" />

declare namespace Express {
  export import Multer = multer;
  export interface Request {
    file?: Multer.File;
    files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
  }
}
