import multer from "multer";
import path from "path";
import fs from "fs";
import { AppError } from "../utils/errors";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Định dạng file không hợp lệ. Chỉ chấp nhận các file ảnh (jpeg, png, webp, gif).",
        400,
      ),
    );
  }
};

const multerInstance = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});

const handleMulterError = (uploadMiddleware: any) => {
  return (req: any, res: any, next: any) => {
    uploadMiddleware(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(
            new AppError(
              "Kích thước file quá lớn. Dung lượng tối đa cho phép là 5MB.",
              400,
            ),
          );
        }
        return next(new AppError(`Lỗi tải tệp tin: ${err.message}`, 400));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

export const upload = {
  single: (fieldname: string) =>
    handleMulterError(multerInstance.single(fieldname)),
  array: (fieldname: string, maxCount?: number) =>
    handleMulterError(multerInstance.array(fieldname, maxCount)),
  fields: (fields: multer.Field[]) =>
    handleMulterError(multerInstance.fields(fields)),
};
