import React, { createContext, useContext, useRef, useEffect } from "react";
import uuid from "react-native-uuid";

const PendingActionsContext = createContext();

export const PendingActionsProvider = ({ children }) => {
  /**
   * Structure of actionsRef.current:
   * {
   *   [actionId]: {
   *     id: string,
   *     type: string,
   *     entityId: string,
   *     expiresAt: number,
   *     timeoutId: TimeoutHandle,
   *     payload: {}
   *   }
   * }
   */
  const actionsRef = useRef({});

  const generateId = () => uuid.v4();

  const addPendingAction = ({
    type,
    entityId,
    delay,
    payload = {},
    onExecute,
    onFinish,
  }) => {
    if (!type || !entityId || !delay) {
      throw new Error(
        "Invalid pending action: type, entityId, delay required."
      );
    }

    const id = generateId();
    const expiresAt = Date.now() + delay;

    const timeoutId = setTimeout(async () => {
      const action = actionsRef.current[id];
      if (!action) return;

      try {
        if (onExecute) {
          await onExecute(action);
        }
      } catch (err) {
        console.error("Pending action execution error:", err);
      }

      delete actionsRef.current[id];

      if (onFinish) onFinish(action);
    }, delay);

    actionsRef.current[id] = {
      id,
      type,
      entityId,
      expiresAt,
      timeoutId,
      payload,
    };

    return id;
  };

  const cancelPendingAction = (id) => {
    const action = actionsRef.current[id];
    if (!action) return;

    clearTimeout(action.timeoutId);
    delete actionsRef.current[id];
  };

  const completePendingAction = async (id, callback) => {
    const action = actionsRef.current[id];
    if (!action) return null;

    clearTimeout(action.timeoutId);

    try {
      if (callback) await callback(action);
    } catch (err) {
      console.error("Manual completion error:", err);
    }

    delete actionsRef.current[id];
    return action;
  };

  const getPendingAction = (id) => actionsRef.current[id] || null;

  const listAllPending = () => ({ ...actionsRef.current });

  const clearAll = () => {
    Object.values(actionsRef.current).forEach((a) => {
      clearTimeout(a.timeoutId);
    });
    // clear the object without reassigning ref
    for (const k of Object.keys(actionsRef.current))
      delete actionsRef.current[k];
  };

  // Prevent memory leaks on logout or navigation resets
  useEffect(() => {
    return () => clearAll();
  }, []);

  return (
    <PendingActionsContext.Provider
      value={{
        addPendingAction,
        cancelPendingAction,
        completePendingAction,
        getPendingAction,
        listAllPending,
        clearAll,
      }}
    >
      {children}
    </PendingActionsContext.Provider>
  );
};

export const usePendingActions = () => useContext(PendingActionsContext);
