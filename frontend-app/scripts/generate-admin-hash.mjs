#!/usr/bin/env node
// scripts/generate-admin-hash.mjs
// -----------------------------------------------------------------------------
// Generate an ADMIN_PASSWORD_HASH (scrypt) without adding any dependency.
//
// Usage:
//   node scripts/generate-admin-hash.mjs "your-password"
//
// Output format (put into ADMIN_PASSWORD_HASH):
//   scrypt:<saltHex>:<hashHex>
// -----------------------------------------------------------------------------

import crypto from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/generate-admin-hash.mjs "your-password"');
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const KEYLEN = 64;
const hash = crypto.scryptSync(password, salt, KEYLEN);

const value = `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;

console.log("\nADMIN_PASSWORD_HASH=" + value + "\n");
console.log("Tip: also set a session secret with:");
console.log(
  '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n',
);
