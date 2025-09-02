import { adminAuth } from './server/firebaseAuth';

async function createEmployeeAccount() {
  try {
    console.log('Creating Firebase account for Queabeats@yahoo.com...');
    
    // Create Firebase user account
    const userRecord = await adminAuth.createUser({
      email: 'Queabeats@yahoo.com',
      password: 'employee123',
      displayName: 'Mequea Maddox',
      emailVerified: true,
    });

    console.log('✅ Firebase account created successfully!');
    console.log('Email:', userRecord.email);
    console.log('UID:', userRecord.uid);
    console.log('Display Name:', userRecord.displayName);
    
    console.log('\n🔑 Login credentials:');
    console.log('Email: Queabeats@yahoo.com');
    console.log('Password: employee123');
    
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      console.log('✅ Firebase account already exists for this email');
      console.log('\n🔑 You can log in with:');
      console.log('Email: Queabeats@yahoo.com');
      console.log('Password: employee123');
    } else {
      console.error('❌ Error creating account:', error);
    }
  }
}

createEmployeeAccount();