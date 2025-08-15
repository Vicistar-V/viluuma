import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Target, Zap } from 'lucide-react';

interface WelcomeTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeTrialModal = ({ isOpen, onClose }: WelcomeTrialModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const features = [
    {
      icon: <Target className="w-6 h-6 text-primary" />,
      title: "Unlimited Goals",
      description: "Create as many goals as you want with AI-powered planning"
    },
    {
      icon: <Sparkles className="w-6 h-6 text-primary" />,
      title: "Smart Scheduling", 
      description: "Intelligent task scheduling that adapts to your lifestyle"
    },
    {
      icon: <Zap className="w-6 h-6 text-primary" />,
      title: "Priority Intelligence",
      description: "Focus on what matters most with AI priority recommendations"
    }
  ];

  const handleNext = () => {
    if (currentStep < features.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <Badge variant="secondary" className="mb-2">
              Welcome to Pro! 🚀
            </Badge>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Your 7-Day Trial Starts Now
            </DialogTitle>
          </div>
        </DialogHeader>

        <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start space-x-4">
            <div className="mt-1">
              {features[currentStep].icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">
                {features[currentStep].title}
              </h3>
              <p className="text-muted-foreground">
                {features[currentStep].description}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-center space-x-2 py-2">
          {features.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          <Button onClick={handleNext}>
            {currentStep < features.length - 1 ? 'Next' : 'Start Creating!'}
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          No commitment • Cancel anytime • Full access for 7 days
        </div>
      </DialogContent>
    </Dialog>
  );
};