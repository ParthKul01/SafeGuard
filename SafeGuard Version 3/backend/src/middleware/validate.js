import { idSchema } from '../schemas/index.js';

const fail = (res, error) =>
  res.status(400).json({ error: 'Validation failed', details: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) });

export const validateBody = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return fail(res, r.error);
  req.body = r.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.query);
  if (!r.success) return fail(res, r.error);
  req.filters = r.data;
  next();
};

export const validateId = (req, res, next) => {
  const r = idSchema.safeParse(req.params.id);
  if (!r.success) return res.status(400).json({ error: 'Invalid id' });
  req.id = r.data;
  next();
};
