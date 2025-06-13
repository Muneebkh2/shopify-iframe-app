import express from 'express';
import { createRequestHandler } from '@remix-run/express';
import * as build from './build/server/index.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.static('public'));

app.all('*', createRequestHandler({ build }));

app.listen(3000, () => {
  console.log('✅ Remix app running on http://localhost:3000');
});
