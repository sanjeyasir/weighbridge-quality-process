import React, { createContext, useContext } from "react";

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const value = {
    notifications: [],
    markAsRead: async () => {},
    markAllAsRead: async () => {}
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
