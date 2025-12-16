const admin = require("firebase-admin");

const getFirebaseAdmin = () => {
  return admin.messaging();
};

module.exports = getFirebaseAdmin;
