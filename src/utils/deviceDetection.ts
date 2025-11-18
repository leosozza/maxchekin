export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const isAndroid = (): boolean => {
  return /Android/i.test(navigator.userAgent);
};
