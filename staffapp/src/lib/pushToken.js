// src/lib/pushToken.js
// Remembers the push token of this phone for a moment, so that the sign-out can tell the API
// "this phone no longer belongs to this person" BEFORE the session ends.
let currentPushToken = null;

export const setPushToken = (token) => {
  currentPushToken = token || null;
};

export const getPushToken = () => currentPushToken;
