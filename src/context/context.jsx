import React, { createContext, useContext } from 'react';

const VaultContext = createContext();

export const VaultProvider = ({ children, value }) => (
  <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
);

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};