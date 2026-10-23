// src/lib/pushEvents.js
// A tiny messenger: when a push about a child arrives, whoever shows the children or their news looks again
// RIGHT AWAY, without waiting for the timer.
const listeners = new Set();

// Whoever wants to know. Returns the function that stops listening.
export const onFamilyPush = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const emitFamilyPush = () => {
  listeners.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      console.log("Push listener failed:", error?.message);
    }
  });
};
