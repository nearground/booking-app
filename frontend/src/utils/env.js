const getEnvValue = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    return import.meta.env[key];
  }

  return undefined;
};

export const API_BASE_URL =
  getEnvValue('VITE_API_BASE_URL') ||
  '';
