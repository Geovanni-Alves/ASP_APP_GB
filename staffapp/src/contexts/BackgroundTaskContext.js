// BackgroundTasksContext.js
import React, { createContext, useContext } from "react";
import * as BackgroundFetch from "expo-background-fetch";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";

const locationEmitter = new EventEmitter();
const LOCATION_UPDATE = "LOCATION_UPDATE";

const BACKGROUND_FETCH_TASK = "background-location-task";

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const location = await Location.getCurrentPositionAsync();

    console.log("Location fetched in the background:", location);

    locationEmitter.emit(LOCATION_UPDATE, location);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Location fetch error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

const BackgroundTaskContext = createContext({});

export const BackgroundTaskProvider = ({ children }) => {
  // useEffect(() => {
  //   // Register the background task when the component mounts
  //   registerBackgroundFetchAsync();

  //   // Unregister the background task when the component unmounts
  //   return () => {
  //     console.log("stop background task");
  //     unregisterBackgroundFetchAsync();
  //   };
  // }, []);

  const registerBackgroundFetchAsync = async () => {
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 5 * 60, // 5 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log("Background fetch task registered. (backgroundtask context)");
    } catch (error) {
      console.error("Background fetch task registration error:", error);
    }
  };

  const unregisterAllTasks = async () => {
    TaskManager.unregisterAllTasksAsync();
  };

  const unregisterBackgroundFetchAsync = async () => {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_FETCH_TASK
      );
      console.log("isRegistered", isRegistered);

      //const isTaskRegistered = await isBackgroundTaskRegistered();

      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        console.log(
          "Background fetch task unregistered. (backgroundtaskcontext)"
        );
      } else {
        console.log(
          "Background fetch task is not registered.(backgroundtaskcontext)"
        );
      }
    } catch (error) {
      console.error("Background fetch task unregistration error:", error);
    }
  };

  return (
    <BackgroundTaskContext.Provider
      value={{
        registerBackgroundFetchAsync,
        unregisterBackgroundFetchAsync,
        unregisterAllTasks,
        locationEmitter,
      }}
    >
      {children}
    </BackgroundTaskContext.Provider>
  );
};

export default BackgroundTaskProvider;

export const useBackgroundTaskContext = () => useContext(BackgroundTaskContext);
