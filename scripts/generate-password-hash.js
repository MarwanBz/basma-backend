#!/usr/bin/env node

/**
 * Script to generate bcrypt hash for password
 * Run with: node scripts/generate-password-hash.js
 */

const bcrypt = require("bcrypt");

async function generateHash() {
  const password = "770108459";
  const saltRounds = 10;

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log("Password:", password);
    console.log("Bcrypt Hash:", hash);
    console.log("");
    console.log("SQL Query:");
    console.log("INSERT INTO users (");
    console.log("    id,");
    console.log("    name,");
    console.log("    email,");
    console.log("    password,");
    console.log("    role,");
    console.log("    emailVerified,");
    console.log("    createdAt,");
    console.log("    updatedAt");
    console.log(") VALUES (");
    console.log("    UUID(),");
    console.log("    'Kaka Mer',");
    console.log("    'kaka.mer1998@gmail.com',");
    console.log(`    '${hash}',`);
    console.log("    'SUPER_ADMIN',");
    console.log("    NOW(),");
    console.log("    NOW(),");
    console.log("    NOW()");
    console.log(");");
  } catch (error) {
    console.error("Error generating hash:", error);
  }
}

generateHash();


