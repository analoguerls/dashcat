/// <binding BeforeBuild='Run - Production' />
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules don't have __dirname, so we need to recreate it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    entry: './dashcat.js',
    output: {
        filename: 'dashcat.bundle.js',
        globalObject: 'this',
        path: path.resolve(__dirname, '')
    }
};
