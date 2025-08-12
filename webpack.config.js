/// <binding BeforeBuild='Run - Production' />
/* eslint-disable no-underscore-dangle, sort-vars */
import {fileURLToPath} from 'url';
import path from 'path';

// ES modules don't have __dirname, so we need to recreate it
const
    __filename = fileURLToPath(import.meta.url),
    __dirname = path.dirname(__filename);

export default {
    entry: './wwwroot/dashcat.js',
    output: {
        filename: 'dashcat.bundle.js',
        globalObject: 'this',
        path: path.resolve(__dirname, './wwwroot')
    }
};
