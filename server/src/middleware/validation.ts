import { z } from 'zod';
import { DateTime } from 'luxon';
const name = z.string().trim().min(2).max(100);
const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const phone = z
  .string()
  .trim()
  .min(5)
  .max(30)
  .regex(/^[+\d ()-]+$/);
const password = z
  .string()
  .min(10)
  .max(72)
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'הסיסמה ארוכה מדי בקידוד UTF-8');
export const id = z.string().regex(/^[a-f\d]{24}$/i, 'מזהה לא תקין');
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => DateTime.fromISO(v).isValid, 'תאריך לא תקין');
export const iso = z.string().datetime({ offset: true });
const hour = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const workingHours = z
  .array(
    z
      .object({ dayOfWeek: z.number().int().min(0).max(6), start: hour, end: hour })
      .strict()
      .refine((h) => h.start < h.end, 'שעת הסיום חייבת להיות מאוחרת מההתחלה'),
  )
  .min(1)
  .max(21)
  .refine(
    (list) =>
      list.every((a, i) =>
        list.every(
          (b, j) => i === j || a.dayOfWeek !== b.dayOfWeek || a.end <= b.start || b.end <= a.start,
        ),
      ),
    'חלונות הקבלה חופפים',
  );
export const schemas = {
  register: z.object({ name, email, phone, password }).strict(),
  login: z
    .object({
      email,
      password: z
        .string()
        .min(1)
        .max(72)
        .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'הסיסמה ארוכה מדי'),
      role: z.enum(['patient', 'doctor', 'admin']),
    })
    .strict(),
  profile: z.object({ name, phone }).strict(),
  booking: z
    .object({
      doctorId: id,
      startAt: iso,
      note: z.string().trim().max(2000).optional(),
      patientId: id.optional(),
    })
    .strict(),
  visit: z
    .object({
      status: z.enum(['completed', 'no_show']),
      visitSummary: z.string().trim().max(10000).optional(),
      prescription: z.string().trim().max(5000).optional(),
    })
    .strict(),
  feedback: z
    .object({
      category: z.enum(['suggestion', 'issue']),
      message: z.string().trim().min(5).max(5000),
    })
    .strict(),
  doctor: z.object({
    name,
    email,
    phone,
    password,
    specialty: z.string().trim().min(2).max(100),
    bio: z.string().trim().max(2000).default(''),
    slotMinutes: z.number().int().min(5).max(120).default(20),
    workingHours,
  }),
  doctorUpdate: z
    .object({
      specialty: z.string().trim().min(2).max(100).optional(),
      bio: z.string().trim().max(2000).optional(),
      slotMinutes: z.number().int().min(5).max(120).optional(),
      workingHours: workingHours.optional(),
      active: z.boolean().optional(),
    })
    .strict()
    .refine((v) => Object.keys(v).length > 0),
  userUpdate: z
    .object({ name: name.optional(), phone: phone.optional(), active: z.boolean().optional() })
    .strict()
    .refine((v) => Object.keys(v).length > 0),
};
