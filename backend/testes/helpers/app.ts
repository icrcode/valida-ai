import express, { Router } from 'express';

export function criarApp(router: Router) {
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return app;
}
