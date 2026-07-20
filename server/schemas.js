// ── Request body schemas ──────────────────────────────────────────────────────
// One place to see exactly what every endpoint accepts. Anything not listed
// here is rejected by validateBody (strict — no unknown fields).

import { patterns } from './validate.js';
import { passwordMinLength } from './config.js';

const { OTP_RE, IMAGE_PATH_RE } = patterns;

export const adminLoginSchema = {
  username: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  password: { type: 'string', required: true, minLength: 1, maxLength: 200 },
};

export const customerSignupSchema = {
  name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  email: { type: 'email', maxLength: 254 },
  phone: { type: 'phone', maxLength: 20 },
  password: { type: 'string', minLength: passwordMinLength, maxLength: 200 },
  auth_provider: { type: 'string', enum: ['local', 'google', 'otp'] },
};

export const customerLoginSchema = {
  email: { type: 'email', maxLength: 254 },
  phone: { type: 'phone', maxLength: 20 },
  password: { type: 'string', required: true, minLength: 1, maxLength: 200 },
};

export const googleLoginSchema = {
  credential: { type: 'string', required: true, minLength: 20, maxLength: 4096 },
  // Accepted for backwards compatibility with the client payload (raw Google
  // userinfo), but NEVER trusted — the server re-fetches the profile from
  // Google itself (see loginWithGoogle), so this object is not inspected.
  googleUser: { type: 'object' },
};

export const sendOtpSchema = {
  phone: { type: 'phone', required: true, maxLength: 20 },
};

export const verifyOtpSchema = {
  phone: { type: 'phone', required: true, maxLength: 20 },
  otp: { type: 'string', required: true, pattern: OTP_RE, patternHint: 'must be a 6-digit code', maxLength: 6 },
  name: { type: 'string', maxLength: 100 },
};

export const reviewSchema = {
  rating: { type: 'numeric', required: true, integer: true, min: 1, max: 5 },
  comment: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
};

export const newsletterSchema = {
  email: { type: 'email', required: true, maxLength: 254 },
};

export const checkoutSchema = {
  firstName: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  lastName: { type: 'string', maxLength: 100 },
  email: { type: 'email', required: true, maxLength: 254 },
  phone: { type: 'phone', maxLength: 20 },
  address: { type: 'string', required: true, minLength: 5, maxLength: 500 },
  cartItems: {
    type: 'array', required: true, minLength: 1, maxLength: 50,
    items: {
      type: 'object',
      fields: {
        id: { type: 'numeric', required: true, integer: true, min: 1, max: 1e9 },
        quantity: { type: 'numeric', integer: true, min: 1, max: 999 },
        qty: { type: 'numeric', integer: true, min: 1, max: 999 },
        size: { type: 'string', maxLength: 40 },
        color: { type: 'string', maxLength: 40 },
        // Client-side display fields — accepted but IGNORED server-side:
        // name/price/etc. are always re-read from the products table.
        name: { type: 'string', maxLength: 200 },
        price: { type: 'numeric', min: 0, max: 1e6 },
        image: { type: 'string', maxLength: 500 },
        category: { type: 'string', maxLength: 50 },
        gender: { type: 'string', maxLength: 20 },
        description: { type: 'string', maxLength: 5000 },
        tagline: { type: 'string', maxLength: 300 },
        details: { type: 'string', maxLength: 5000 },
        style_type: { type: 'string', maxLength: 100 },
        colors: { type: 'string', maxLength: 300 },
        additional_images: { type: 'string', maxLength: 5000 },
        featured: { type: 'numeric', integer: true, min: 0, max: 1 },
        // Cart-context bookkeeping fields — accepted, ignored server-side.
        cartItemId: { type: 'string', maxLength: 300 },
        stockLimit: { type: 'numeric', min: 0, max: 1e9 },
      },
    },
  },
  totalAmount: { type: 'numeric', min: 0, max: 1e7 }, // ignored — recomputed server-side
  paymentMethod: { type: 'string', maxLength: 40 },
  paymentMethodId: { type: 'string', maxLength: 255, pattern: /^pm_[A-Za-z0-9_]+$/, patternHint: 'is not a valid payment method id' },
};

export const wishlistAddSchema = {
  productId: { type: 'numeric', required: true, integer: true, min: 1, max: 1e9 },
};

// PATCH semantics: omitted field = unchanged, empty string = clear the value.
// (The 'phone' format check only applies to non-empty values.)
export const profileUpdateSchema = {
  phone: { type: 'phone', maxLength: 20 },
  address: { type: 'string', maxLength: 500 },
};

export const productSchema = {
  id: { type: 'numeric', integer: true, min: 0 }, // sent by the admin UI on edit; route param wins
  name: { type: 'string', required: true, minLength: 2, maxLength: 200 },
  price: { type: 'numeric', required: true, min: 0.01, max: 1e6 },
  quantity: { type: 'numeric', integer: true, min: 0, max: 1e6 },
  category: { type: 'string', maxLength: 50 },
  gender: { type: 'string', maxLength: 20 },
  image: { type: 'string', maxLength: 500, pattern: IMAGE_PATH_RE, patternHint: 'must be a relative path (/) or HTTPS URL' },
  description: { type: 'string', maxLength: 5000 },
  tagline: { type: 'string', maxLength: 300 },
  details: { type: 'string', maxLength: 5000 },
  style_type: { type: 'string', maxLength: 100 },
  colors: { type: 'string', maxLength: 300 },
  additional_images: { type: 'string', maxLength: 5000 },
  featured: { type: 'numeric', integer: true, min: 0, max: 1 },
};

/**
 * additional_images arrives as a JSON string (the admin UI stringifies an
 * array). Verify it decodes to ≤20 image paths/URLs; returns an error string
 * or null.
 */
export function validateAdditionalImages(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return 'additional_images must be a JSON array'; }
  if (!Array.isArray(parsed) || parsed.length > 20) return 'additional_images must be an array of at most 20 entries';
  for (const entry of parsed) {
    if (typeof entry !== 'string' || entry.length > 500 || !IMAGE_PATH_RE.test(entry)) {
      return 'additional_images entries must be relative paths (/) or HTTPS URLs';
    }
  }
  return null;
}
