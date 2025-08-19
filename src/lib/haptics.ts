import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// Mobile-first haptic feedback service using Capacitor
class HapticFeedbackService {
  private isAvailable: boolean;

  constructor() {
    // Haptics are only available on mobile platforms
    this.isAvailable = Capacitor.isNativePlatform();
  }

  // Success feedback - for task completions, goal achievements
  async success() {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  // Error feedback - for failures, validation errors
  async error() {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  // Warning feedback - for important actions, confirmations
  async warning() {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  // Light impact - for button taps, UI interactions
  async light() {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  // Medium impact - for significant actions, toggles
  async medium() {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  // Heavy impact - for major actions, achievements
  async heavy() {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  // Vibrate for a specific duration (custom pattern)
  async vibrate(duration: number = 200) {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  // Task completion celebration - custom sequence
  async taskComplete() {
    if (!this.isAvailable) return;
    
    try {
      // Double tap for satisfaction
      await Haptics.impact({ style: ImpactStyle.Medium });
      setTimeout(async () => {
        await Haptics.impact({ style: ImpactStyle.Light });
      }, 100);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  // Goal completion celebration - more intense
  async goalComplete() {
    if (!this.isAvailable) return;
    
    try {
      // Triple tap celebration
      await Haptics.impact({ style: ImpactStyle.Heavy });
      setTimeout(async () => {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }, 100);
      setTimeout(async () => {
        await Haptics.impact({ style: ImpactStyle.Light });
      }, 200);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }
}

// Export singleton instance
export const haptics = new HapticFeedbackService();