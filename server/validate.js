// ── Strict input validation ───────────────────────────────────────────────────
// Every request body is validated against an explicit schema: unknown fields,
// wrong types, out-of-range lengths and malformed formats are REJECTED (400),
// not silently sanitized. Validation messages are intentionally field-level and
// human-readable — they describe the client's own input, never internals.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s()-]{7,20}$/;
const OTP_RE = /^[0-9]{6}$/;
const SAFE_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
const IMAGE_PATH_RE = /^(\/|https:\/\/)[^\s"'<>]{1,500}$/;

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

/**
 * Validates `value` against a field spec. Returns an error string or null.
 * Spec: { type, required, minLength, maxLength, min, max, pattern,
 *         patternHint, enum, integer, items, fields }
 * Types: string | email | phone | number | numeric (number or numeric string)
 *        | boolean | array | object
 */
function checkField(name, value, spec) {
  if (value === undefined || value === null || value === '') {
    return spec.required ? `${name} is required` : null;
  }

  const t = typeOf(value);

  switch (spec.type) {
    case 'string':
    case 'email':
    case 'phone': {
      if (t !== 'string') return `${name} must be a string`;
      const trimmed = value.trim();
      if (spec.required && trimmed.length === 0) return `${name} is required`;
      const min = spec.minLength ?? 0;
      const max = spec.maxLength ?? 1000;
      if (trimmed.length < min) return `${name} must be at least ${min} characters`;
      if (value.length > max) return `${name} must be at most ${max} characters`;
      if (spec.type === 'email' && !EMAIL_RE.test(trimmed)) return `${name} must be a valid email address`;
      if (spec.type === 'phone' && !PHONE_RE.test(trimmed)) return `${name} must be a valid phone number`;
      if (spec.pattern && !spec.pattern.test(trimmed)) return `${name} ${spec.patternHint || 'has an invalid format'}`;
      if (spec.enum && !spec.enum.includes(trimmed)) return `${name} must be one of: ${spec.enum.join(', ')}`;
      return null;
    }
    case 'number':
    case 'numeric': {
      // 'numeric' additionally accepts numeric strings (HTML form inputs).
      let num;
      if (t === 'number') num = value;
      else if (spec.type === 'numeric' && t === 'string' && value.trim() !== '') num = Number(value);
      else return `${name} must be a number`;
      if (!Number.isFinite(num)) return `${name} must be a finite number`;
      if (spec.integer && !Number.isInteger(num)) return `${name} must be an integer`;
      if (spec.min !== undefined && num < spec.min) return `${name} must be at least ${spec.min}`;
      if (spec.max !== undefined && num > spec.max) return `${name} must be at most ${spec.max}`;
      return null;
    }
    case 'boolean':
      return t === 'boolean' ? null : `${name} must be a boolean`;
    case 'array': {
      if (t !== 'array') return `${name} must be an array`;
      const min = spec.minLength ?? 0;
      const max = spec.maxLength ?? 100;
      if (value.length < min) return `${name} must have at least ${min} item(s)`;
      if (value.length > max) return `${name} must have at most ${max} item(s)`;
      if (spec.items) {
        for (let i = 0; i < value.length; i++) {
          const err = checkField(`${name}[${i}]`, value[i], spec.items);
          if (err) return err;
        }
      }
      return null;
    }
    case 'object': {
      if (t !== 'object') return `${name} must be an object`;
      if (spec.fields) {
        const err = checkObject(value, spec.fields, name);
        if (err) return err;
      }
      return null;
    }
    default:
      return `${name} has an unsupported type`;
  }
}

function checkObject(obj, schema, prefix = '') {
  const label = (key) => (prefix ? `${prefix}.${key}` : key);
  for (const key of Object.keys(obj)) {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      return `${label(key)} is not an accepted field`;
    }
  }
  for (const [key, spec] of Object.entries(schema)) {
    const err = checkField(label(key), obj[key], spec);
    if (err) return err;
  }
  return null;
}

/**
 * Express middleware factory. Rejects with 400 when the JSON body does not
 * match `schema` exactly (unknown fields included).
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const body = req.body;
    if (typeOf(body) !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }
    const err = checkObject(body, schema);
    if (err) return res.status(400).json({ error: err });
    next();
  };
}

/** Validates that a route :param is a positive integer id. */
export function validateIntParam(param) {
  return (req, res, next) => {
    const raw = req.params[param];
    if (!/^[0-9]{1,12}$/.test(raw)) return res.status(400).json({ error: `Invalid ${param}` });
    next();
  };
}

/** Validates that a route :param is a safe opaque id (sqlite int or blob key). */
export function validateSafeIdParam(param) {
  return (req, res, next) => {
    if (!SAFE_ID_RE.test(req.params[param])) return res.status(400).json({ error: `Invalid ${param}` });
    next();
  };
}

export const patterns = { EMAIL_RE, PHONE_RE, OTP_RE, SAFE_ID_RE, IMAGE_PATH_RE };
