import fs from 'node:fs';
import path from 'node:path';

const projectRoot =
  typeof __dirname !== 'undefined' ? path.resolve(__dirname, '..', '..') : process.cwd();
const distTemplatesDir = path.resolve(projectRoot, 'dist', 'templates');
const srcTemplatesDir = path.resolve(projectRoot, 'src', 'templates');

export const resolveAsset = (relPath: string) => {
  const distPath = path.resolve(distTemplatesDir, relPath);

  if (process.env.NODE_ENV === 'production') {
    return distPath;
  }

  if (fs.existsSync(distPath)) {
    return distPath;
  }

  return path.resolve(srcTemplatesDir, relPath);
};
