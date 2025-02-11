import cors from 'cors';
import { config } from '../config';

export const corsMiddleware = cors({
  origin: config.cors.origins,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  credentials: config.cors.credentials,
  maxAge: config.cors.maxAge
}); 