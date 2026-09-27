import express from 'express';
import { authRateLimiter } from '../middleware/security.middleware';

async function main() {
  const app = express();
  app.use('/api/auth', authRateLimiter);
  app.get('/api/auth/me', (_req, res) => {
    res.status(200).json({ status: 'success', data: { user: null } });
  });

  const server = app.listen(0, () => {
    const { port } = server.address() as { port: number };
    const base = `http://127.0.0.1:${port}/api/auth`;

    const requests = Array.from({ length: 6 }, (_, index) =>
      fetch(`${base}/me`).then((response) => ({ index, status: response.status }))
    );

    Promise.all(requests)
      .then((results) => {
        console.log(JSON.stringify(results, null, 2));
        const blocked = results.filter((result) => result.status === 429);
        if (blocked.length > 0) {
          console.error('Expected /auth/me to avoid auth rate limiting, but it was rate limited.');
          process.exit(1);
        }
        server.close();
      })
      .catch((error) => {
        console.error(error);
        server.close();
        process.exit(1);
      });
  });
}

main();
