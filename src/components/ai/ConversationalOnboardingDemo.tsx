import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, Clock, MessageCircle, Target, Zap } from "lucide-react";

interface DemoStep {
  id: string;
  title: string;
  description: string;
  status: "completed" | "pending" | "active";
  icon: any;
}

const ConversationalOnboardingDemo = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const demoSteps: DemoStep[] = [
    {
      id: "greeting",
      title: "Natural Greeting",
      description: "AI greets user warmly and asks about their goal",
      status: "completed",
      icon: MessageCircle
    },
    {
      id: "goal_understanding", 
      title: "Goal Understanding",
      description: "User shares their goal, AI shows enthusiasm and understanding",
      status: "completed",
      icon: Target
    },
    {
      id: "date_picker",
      title: "Smart Date Selection",
      description: "AI asks about timeline, shows calendar picker with choices",
      status: "completed", 
      icon: Calendar
    },
    {
      id: "modality_inference",
      title: "Automatic Project Type",
      description: "Based on date choice, AI infers Project vs Checklist automatically",
      status: "completed",
      icon: Zap
    },
    {
      id: "commitment_profile",
      title: "Daily-First Commitment",
      description: "For projects, AI asks about time commitment with daily-first UI",
      status: "completed",
      icon: Clock
    },
    {
      id: "plan_generation",
      title: "Intelligent Plan Creation", 
      description: "AI generates personalized plan using daily budget data",
      status: "completed",
      icon: CheckCircle
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "active": return "bg-blue-500 animate-pulse";
      case "pending": return "bg-gray-300";
      default: return "bg-gray-300";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-green-500 text-white">✅ Implemented</Badge>;
      case "active": return <Badge className="bg-blue-500 text-white">🔄 Active</Badge>;
      case "pending": return <Badge variant="outline">⏳ Pending</Badge>;
      default: return <Badge variant="outline">⏳ Pending</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Target className="h-6 w-6 text-primary" />
          "Truly Human" Conversational Onboarding
          <Badge className="bg-green-500 text-white">🎉 COMPLETE</Badge>
        </CardTitle>
        <p className="text-muted-foreground">
          Complete implementation of natural, inference-based goal onboarding with seamless UI integration.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Implementation Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-semibold">Frontend Components</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                DatePickerInChat, ChoiceButtons, Enhanced AIOnboardingWizard
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-semibold">Backend Integration</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Enhanced onboard-goal AI, dailyBudget support in generate-plan
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="font-semibold">Conversation Flow</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Natural inference, seamless UI transitions, daily-first commitment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Step-by-Step Implementation */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Implementation Steps
          </h3>
          
          {demoSteps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(step.status)}`}>
                    <StepIcon className="h-5 w-5 text-white" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{step.title}</h4>
                      {getStatusBadge(step.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Key Features Implemented */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">🎯 Key Features Implemented:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Conversation Intelligence</h4>
              <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                <li>• Inference-based modality detection</li>
                <li>• Natural timeline questioning</li>
                <li>• Context-aware responses</li>
                <li>• Seamless UI transitions</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Enhanced User Experience</h4>
              <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                <li>• Calendar picker during conversation</li>
                <li>• Daily-first commitment planning</li>
                <li>• Choice buttons for key decisions</li>
                <li>• Intelligent input area management</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Technical Integration</h4>
              <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                <li>• Enhanced AI prompt system</li>
                <li>• DailyBudget data structure support</li>
                <li>• Complete plan generation pipeline</li>
                <li>• TypeScript type safety</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ User Flow Optimization</h4>
              <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                <li>• No technical jargon for users</li>
                <li>• Progressive disclosure of complexity</li>
                <li>• Mobile-optimized components</li>
                <li>• Smooth animations and feedback</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Summary */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">🎉 Implementation Complete!</h3>
                <p className="text-muted-foreground mb-4">
                  The "Truly Human" conversational onboarding system has been fully implemented and integrated. 
                  Users now experience a natural, intelligent conversation that seamlessly gathers their goal information 
                  and creates personalized plans without any technical complexity.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-green-500 text-white">Natural Conversation</Badge>
                  <Badge className="bg-blue-500 text-white">Smart Inference</Badge>
                  <Badge className="bg-purple-500 text-white">Daily-First Planning</Badge>
                  <Badge className="bg-orange-500 text-white">Seamless UI</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default ConversationalOnboardingDemo;