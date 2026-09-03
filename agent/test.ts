import { fileURLToPath } from 'node:url';
console.log('argv[1]', process.argv[1]);
console.log('fileURLToPath', fileURLToPath(import.meta.url));
