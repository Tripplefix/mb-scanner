import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import {
  listEvents, getEvent, createEvent, updateEvent, deleteEvent,
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- API ---
const api = express.Router();

api.get('/events', (req, res) => {
  res.json(listEvents());
});

api.get('/events/:id', (req, res) => {
  const event = getEvent(Number(req.params.id));
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

api.post('/events', (req, res) => {
  if (!req.body?.name) return res.status(400).json({ error: 'name is required' });
  res.status(201).json(createEvent(req.body));
});

api.put('/events/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!getEvent(id)) return res.status(404).json({ error: 'Event not found' });
  res.json(updateEvent(id, req.body));
});

api.delete('/events/:id', (req, res) => {
  const ok = deleteEvent(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Event not found' });
  res.status(204).end();
});

app.use('/api', api);

// --- Static frontend (production build) ---
const publicDir = join(__dirname, 'public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback for non-API routes
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(join(publicDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`MB Scanner backend listening on http://localhost:${PORT}`);
});
