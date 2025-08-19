import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Zap, 
  Target, 
  Calendar, 
  Sparkles, 
  Check,
  X,
  Loader2
} from "lucide-react";
import { useRevenueCat } from "@/hooks/useSubscription";
import { ProUpgradeModal } from "@/components/subscription/ProUpgradeModal";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'goal_limit' | 'archive_limit' | 'premium_feature' | 'feature_request' | 'manual';
  title?: string;
  description?: string;
}

export const PaywallModal = ({ 
  isOpen, 
  onClose, 
  trigger = 'goal_limit',
  title,
  description 
}: PaywallModalProps) => {
  // Use the new ProUpgradeModal for actual purchases
  return (
    <ProUpgradeModal 
      isOpen={isOpen}
      onClose={onClose}
      trigger={trigger}
    />
  );
};