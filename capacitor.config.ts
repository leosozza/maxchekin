import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a7815218e41342ee96d4c4c844565611',
  appName: 'MaxCheckin',
  webDir: 'dist',
  server: {
    url: 'https://a7815218-e413-42ee-96d4-c4c844565611.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    BarcodeScanner: {
      cameraDirection: 'back',
    },
  },
};

export default config;
