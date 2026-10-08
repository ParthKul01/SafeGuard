import { z } from 'zod';

// Strip angle brackets so stored text can never be rendered as markup.
const text = (max) => z.string().trim().min(1).max(max).transform((s) => s.replace(/[<>]/g, ''));
const level = z.enum(['LOW', 'MODERATE', 'HIGH']);
const score = z.number().min(0).max(100);

export const contactSchema = z.object({
  name: text(80),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number'),
  relationship: text(40),
  isPrimary: z.boolean().default(false),
  alertEnabled: z.boolean().default(false),
});

export const alertSchema = z.object({
  location: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  place: text(120).optional(),
  riskLevel: level,
  riskScore: score,
  detectedEvent: text(120),
});

export const historyQuerySchema = z.object({
  riskLevel: level.optional(),
  event: z.string().trim().max(60).optional(),
  status: z.enum(['CONFIRMED', 'DISMISSED']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const idSchema = z.coerce.number().int().positive();

export const locationQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const crimePredictSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  hour: z.number().int().min(0).max(23).optional(),      // local hour; defaults to server time
  dayOfWeek: z.number().int().min(0).max(6).optional(),  // 0 = Sunday
});

export const riskCalculateSchema = z.object({
  crime: score,
  threat: score,
  fall: score,
  geofence: score,
});

// Contract every crime model (mock or real) must return.
export const crimeResultSchema = z.object({
  riskLevel: level,
  probability: z.number().min(0).max(1),
  factors: z.array(z.string()).max(10),
});

const voiceClass = z.enum(['NORMAL', 'DISTRESS', 'THREAT']);

export const voiceQuerySchema = z.object({
  demo: z.enum(['normal', 'distress', 'threat']).optional(), // honoured only by the mock speech-to-text stage
});
export const sttResultSchema = z.object({ transcription: z.string().max(4000) });
export const classifierResultSchema = z.object({
  classification: voiceClass,
  probability: z.number().min(0).max(1),
  threatProbability: z.number().min(0).max(1).optional(),
});
