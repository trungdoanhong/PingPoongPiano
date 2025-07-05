#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Setting up Firebase for Pink Poong Piano...\n');

// Check if Firebase CLI is installed
try {
  execSync('firebase --version', { stdio: 'ignore' });
  console.log('✅ Firebase CLI is installed');
} catch (error) {
  console.log('❌ Firebase CLI not found. Installing...');
  execSync('npm install -g firebase-tools', { stdio: 'inherit' });
  console.log('✅ Firebase CLI installed');
}

// Initialize Firebase if not already done
if (!fs.existsSync('.firebaserc')) {
  console.log('\n🏗️  Initializing Firebase project...');
  console.log('Please run the following commands manually:');
  console.log('1. firebase login');
  console.log('2. firebase use --add pinkpoongpiano');
  console.log('3. npm run setup:firebase');
  process.exit(1);
}

// Deploy Firestore rules
try {
  console.log('\n📋 Deploying Firestore rules...');
  execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });
  console.log('✅ Firestore rules deployed successfully');
} catch (error) {
  console.log('❌ Failed to deploy Firestore rules');
  console.log('Manual steps:');
  console.log('1. firebase login');
  console.log('2. firebase deploy --only firestore:rules');
}

// Create default admin user document template
const adminUserTemplate = {
  setup_instructions: "This is a template for admin users in Firestore",
  admin_emails: [
    "trungdoanhong@gmail.com",
    "jonyvanthan@gmail.com"
  ],
  users_collection_structure: {
    uid: "user_uid_here",
    email: "user@example.com",
    displayName: "User Display Name",
    photoURL: "https://example.com/photo.jpg",
    role: "admin", // admin, moderator, user
    createdAt: "timestamp",
    lastLogin: "timestamp",
    songsCreated: 0,
    totalScore: 0
  }
};

// Write setup instructions
fs.writeFileSync(
  'firebase-setup-instructions.json', 
  JSON.stringify(adminUserTemplate, null, 2)
);

console.log('\n📄 Created firebase-setup-instructions.json');
console.log('\n🎯 Next steps:');
console.log('1. Login to Firebase Console: https://console.firebase.google.com/');
console.log('2. Go to Firestore Database');
console.log('3. Create a user document manually for admin access');
console.log('4. Test the admin panel in your app');
console.log('\n✅ Firebase setup complete!'); 