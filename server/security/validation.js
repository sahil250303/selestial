import { z } from 'zod';

const trimmed = (schema) => z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), schema);

export const emailSchema = trimmed(z.string().min(3).max(254).email());
export const phoneSchema = trimmed(z.string().min(4).max(20).regex(/^\+?[0-9\s().-]+$/, 'Invalid phone number'));
export const nameSchema = trimmed(z.string().min(1).max(120));
export const shortText = trimmed(z.string().min(1).max(255));
export const longText = trimmed(z.string().min(1).max(10_000));
export const passwordSchema = z.string().min(8).max(200);
export const otpSchema = trimmed(z.string().regex(/^\d{4,8}$/, 'OTP must be 4-8 digits'));
export const idParam = z.coerce.number().int().positive().max(9_999_999);
export const filenameParam = trimmed(z.string().min(1).max(255).regex(/^[A-Za-z0-9._-]+$/, 'Invalid filename'));

export const adminLoginSchema = z.object({
  username: trimmed(z.string().min(1).max(64)),
  password: passwordSchema
}).strict();

export const customerSignupSchema = z.object({
  name: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  password: passwordSchema.optional(),
  auth_provider: z.enum(['local', 'google', 'otp']).optional()
}).strict().refine((v) => v.email || v.phone, {
  message: 'Either email or phone is required',
  path: ['email']
});

export const customerLoginSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  password: passwordSchema.optional(),
  auth_provider: z.enum(['local', 'google', 'otp']).optional()
}).strict().refine((v) => v.email || v.phone, {
  message: 'Either email or phone is required',
  path: ['email']
});

export const sendOtpSchema = z.object({
  phone: phoneSchema
}).strict();

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
  name: nameSchema.optional()
}).strict();

const cartItemSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().min(1).max(64)]).optional(),
  name: shortText,
  price: z.coerce.number().finite().nonnegative().max(1_000_000),
  quantity: z.coerce.number().int().positive().max(1000).optional(),
  qty: z.coerce.number().int().positive().max(1000).optional(),
  size: trimmed(z.string().max(32)).optional(),
  color: trimmed(z.string().max(32)).optional(),
  image: trimmed(z.string().max(2048)).optional()
}).passthrough();

export const checkoutSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  address: trimmed(z.string().min(1).max(1000)),
  cartItems: z.array(cartItemSchema).min(1).max(100),
  totalAmount: z.coerce.number().finite().nonnegative().max(10_000_000),
  paymentMethod: trimmed(z.string().min(1).max(64)).optional()
}).strict().refine((v) => v.email || v.phone, {
  message: 'Either email or phone is required for checkout',
  path: ['email']
});

export const productWriteSchema = z.object({
  name: shortText,
  price: z.coerce.number().finite().nonnegative().max(10_000_000),
  category: trimmed(z.string().min(1).max(64)),
  gender: z.enum(['men', 'women', 'both', 'unisex']).optional(),
  image: trimmed(z.string().min(1).max(2048)),
  description: longText,
  tagline: trimmed(z.string().max(255)).optional().nullable(),
  details: trimmed(z.string().max(10_000)).optional().nullable(),
  style_type: trimmed(z.string().max(64)).optional().nullable(),
  colors: trimmed(z.string().max(500)).optional().nullable(),
  quantity: z.coerce.number().int().nonnegative().max(1_000_000).optional(),
  additional_images: trimmed(z.string().max(10_000)).optional().nullable()
}).strict();

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const target = req[source];
    const result = schema.safeParse(target);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message
      }));
      return res.status(400).json({ error: 'Validation failed', issues });
    }
    req[source] = result.data;
    next();
  };
}
