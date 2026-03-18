import * as dotenv from 'dotenv';
import * as path from 'path';

async function globalSetup() {
  dotenv.config({
    path: path.resolve(process.cwd(), '.env.local'),
    override: true,
  });
}

export default globalSetup;
