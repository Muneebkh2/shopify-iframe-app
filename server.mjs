import express from 'express';
import { createRequestHandler } from '@remix-run/express';
import * as build from './build/server/index.js';
import shopify from './app/shopify.server.ts';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.use(shopify.auth.begin());
app.use(shopify.auth.callback());
app.use(shopify.ensureInstalledInShop());

app.use(express.static('public'));
app.use('/api/webhooks', shopify.processWebhooks());

app.all('*', createRequestHandler({ build, mode: process.env.NODE_ENV }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
