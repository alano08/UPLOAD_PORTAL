// hash-password.js
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Please provide a password. Usage: node hash-password.js "your-password-here"');
  process.exit(1);
}

const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync(password, salt);

console.log('Your password hash is:');
console.log(hash);