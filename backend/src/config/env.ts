import path from 'path';
import dotenv from 'dotenv';

// Load .env from the backend project root (works for both `tsx src/` and `node dist/`).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
