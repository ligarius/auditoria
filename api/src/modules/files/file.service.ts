import fs from 'fs';
import path from 'path';

import { prisma } from '../../core/config/db.js';

const storagePath = process.env.FILE_STORAGE_PATH ?? './storage';

if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

export const fileService = {
  async save(projectId: string, file: Express.Multer.File, userId: string) {
    const dest = path.join(storagePath, file.filename);
    fs.renameSync(file.path, dest);
    return prisma.file.create({
      data: {
        projectId,
        path: dest,
        filename: file.originalname,
        mime: file.mimetype,
        size: file.size,
        uploadedBy: userId
      }
    });
  },

  async list(projectId: string) {
    return prisma.file.findMany({ where: { projectId } });
  }
};
