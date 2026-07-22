const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = mongoose.connection.collection('users');
  await User.updateMany(
    { email: { $ne: 'skjainoddin39854@gmail.com' } }, 
    { $set: { plan: 'free', credits: 15 } }
  );
  console.log('Fixed users in DB!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
