require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const res = await mongoose.connection.collection('users').updateMany({}, { $set: { plan: 'starter', credits: 500 } });
  console.log('Updated:', res);
  process.exit(0);
}).catch(console.error);
