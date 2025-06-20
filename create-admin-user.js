#!/usr/bin/env node

/**
 * Firebase Admin User Creation Script
 * This script creates an admin user with email: admin@admin.com and password: admin1
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local manually
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
        process.env[key] = value;
      }
    });
  }
}

// Load environment variables
loadEnvFile();

async function createAdminUser() {
  try {
    console.log('🔥 Initializing Firebase Admin SDK...');
    
    // Initialize Firebase Admin SDK
    let app;
    if (!getApps().length) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      // Validate required environment variables
      if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error('Missing required Firebase environment variables. Please check your .env.local file.');
      }

      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
      app = getApps()[0];
      console.log('✅ Using existing Firebase Admin SDK instance');
    }

    const auth = getAuth(app);

    console.log('👤 Creating admin user...');
    
    const userRecord = await auth.createUser({
      email: 'admin@admin.com',
      password: 'admin1',
      emailVerified: true,
      displayName: 'Admin User',
    });

    console.log('🎉 Successfully created admin user!');
    console.log('📧 Email:', userRecord.email);
    console.log('🆔 UID:', userRecord.uid);
    console.log('📅 Created:', new Date(userRecord.metadata.creationTime).toLocaleString());
    
    // Optionally set custom claims for admin privileges
    try {
      await auth.setCustomUserClaims(userRecord.uid, { admin: true, role: 'admin' });
      console.log('👑 Admin privileges granted successfully');
    } catch (claimsError) {
      console.warn('⚠️  Warning: Could not set admin claims:', claimsError.message);
    }

    console.log('\n✅ Admin user creation completed successfully!');
    console.log('📝 Login credentials:');
    console.log('   Email: admin@admin.com');
    console.log('   Password: admin1');
    
  } catch (error) {
    console.error('❌ Error creating admin user:');
    
    if (error.code === 'auth/email-already-exists') {
      console.error('   The email admin@admin.com is already in use by another user.');
      console.log('\n💡 If you want to reset this user, you can:');
      console.log('   1. Delete the existing user from Firebase Console');
      console.log('   2. Or use a different email address');
    } else if (error.code === 'auth/weak-password') {
      console.error('   The password is too weak. Please use a stronger password.');
    } else if (error.code === 'auth/invalid-email') {
      console.error('   The email address is invalid.');
    } else {
      console.error('   Error code:', error.code || 'unknown');
      console.error('   Error message:', error.message);
    }
    
    process.exit(1);
  }
}

// Check if required dependencies are available
try {
  require('firebase-admin/app');
  require('firebase-admin/auth');
} catch (error) {
  console.error('❌ Missing dependencies. firebase-admin should already be installed.');
  console.error('   If not, please install it with:');
  console.error('   npm install firebase-admin');
  console.error('   or');
  console.error('   yarn add firebase-admin');
  process.exit(1);
}

// Run the script
console.log('🚀 Starting Firebase Admin User Creation Script');
console.log('================================================');
createAdminUser();