import { Router } from 'express';
import { contactSchema } from '../schemas/index.js';
import { validateBody, validateId } from '../middleware/validate.js';

export default function contactsRouter(contacts) {
  const r = Router();
  r.get('/', (_req, res) => res.json(contacts.list()));
  r.post('/', validateBody(contactSchema), (req, res) => res.status(201).json(contacts.create(req.body)));
  r.put('/:id', validateId, validateBody(contactSchema), (req, res) => {
    const updated = contacts.update(req.id, req.body);
    updated ? res.json(updated) : res.status(404).json({ error: 'Contact not found' });
  });
  r.delete('/:id', validateId, (req, res) =>
    contacts.remove(req.id) ? res.status(204).end() : res.status(404).json({ error: 'Contact not found' }));
  return r;
}
