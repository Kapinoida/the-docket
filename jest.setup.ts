import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });

// Auth helpers throw at import time when JWT_SECRET is missing, so give the
// test environment a deterministic value (real env wins if it is present).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'docket-test-jwt-secret';
