import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.be90748d9eb2423e8629af106fe98bf4',
  appName: 'viluuma',
  webDir: 'dist',
  server: {
    url: 'https://be90748d-9eb2-423e-8629-af106fe98bf4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;