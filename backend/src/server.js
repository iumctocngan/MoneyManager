import app from './app.js';
import { env } from './config/env.js';
import { testConnection } from './config/database.js';

async function startServer() {
  await testConnection();

  app.listen(env.port, () => {
    console.log(`Backend is running on http://localhost:${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start backend server.');
  console.error(error);
  process.exit(1);
});
