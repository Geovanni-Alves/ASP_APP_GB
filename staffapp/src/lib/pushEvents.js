// src/lib/pushEvents.js
// A tiny messenger between the push provider (which is outside of the routes) and the routes: when a push
// about a route arrives, the routes are looked at again RIGHT AWAY, without waiting for the timer.
const listeners = new Set();

// Whoever wants to know. Returns the function that stops listening.
export const onRoutePush = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const emitRoutePush = () => {
  listeners.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      console.log("Route push listener failed:", error?.message);
    }
  });
};
