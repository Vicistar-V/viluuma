import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Sparkles, Crown, ArrowLeft, Target, Lightbulb, Zap, Rocket } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { UpgradePrompt } from "@/components/paywall/UpgradePrompt";

const CreateManualGoalScreen = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const subscription = useSubscription();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [modality, setModality] = useState<"project" | "checklist">("project");
  const [date, setDate] = useState<Date | undefined>();
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    document.title = "Create Goal | Manual Mode";
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  const onCreate = async () => {
    try {
      if (!title.trim()) {
        toast({ title: "Title required", description: "Please enter a goal title" });
        return;
      }
      const { data, error } = await supabase.rpc("create_manual_goal", {
        p_title: title.trim(),
        p_modality: modality,
        p_target_date: modality === "project" ? (date ? format(date, "yyyy-MM-dd") : null) : null,
        p_description: description.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Goal created", description: "Let’s build it out" });
      navigate(`/goals/${data}`);
    } catch (e: any) {
      toast({ title: "Could not create goal", description: e.message });
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Create New Goal
                </h1>
                <p className="text-muted-foreground text-sm">Build something amazing today</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                    <Lightbulb className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">AI Planning</p>
                    <p className="text-xs text-muted-foreground">Intelligent goals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20">
                    <Zap className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Manual Mode</p>
                    <p className="text-xs text-muted-foreground">Full control</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20">
                    <Rocket className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Quick Start</p>
                    <p className="text-xs text-muted-foreground">Ready to go</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20">
                    <Target className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Goal Types</p>
                    <p className="text-xs text-muted-foreground">Projects & lists</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Status */}
          {subscription.entitlement === 'free' && (
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">Free Plan Active</h3>
                      <p className="text-sm text-muted-foreground">
                        {subscription.activeGoalCount}/2 goals created
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowPaywall(true)}
                    className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all duration-300"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 pb-28 space-y-8">
        {/* Creation Options */}
        <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 shadow-xl animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Choose Your Path
            </CardTitle>
            <CardDescription className="text-base">
              Start with AI assistance or build from scratch
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-24 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30 hover:from-blue-500/20 hover:to-blue-600/20 hover:border-blue-500/50 transition-all duration-300" 
              onClick={() => navigate("/goals/ai")}
            > 
              <div className="flex flex-col items-center space-y-2">
                <Sparkles className="h-6 w-6 text-blue-500" />
                <span className="font-medium">AI Planner</span>
                <span className="text-xs text-muted-foreground">Smart & guided</span>
              </div>
            </Button>
            <Button 
              className="h-24 bg-gradient-to-br from-primary to-secondary hover:shadow-lg transition-all duration-300" 
              onClick={() => setShowForm(true)}
            >
              <div className="flex flex-col items-center space-y-2">
                <Target className="h-6 w-6" />
                <span className="font-medium">Manual Creation</span>
                <span className="text-xs opacity-80">Full control</span>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Goal Creation Form */}
        {showForm && (
          <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 shadow-xl animate-fade-in">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Goal Details
              </CardTitle>
              <CardDescription className="text-base">
                Configure your new goal with precision
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-base font-medium">Goal Title</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g., Master React Development" 
                  className="h-12 text-base bg-gradient-to-r from-background/80 to-background/60 border-border/70"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="description" className="text-base font-medium">Description (Optional)</Label>
                <Input 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="e.g., Build modern web applications with React and TypeScript" 
                  className="h-12 text-base bg-gradient-to-r from-background/80 to-background/60 border-border/70"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Goal Type</Label>
                <RadioGroup value={modality} onValueChange={(v) => setModality(v as any)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative border-2 rounded-xl p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30 hover:from-blue-500/20 hover:to-blue-600/20 hover:border-blue-500/50 transition-all duration-300">
                    <RadioGroupItem value="project" id="project" className="absolute top-4 right-4" />
                    <Label htmlFor="project" className="cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                          <Rocket className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">Project</p>
                          <p className="text-sm text-muted-foreground">Complex goals with deadlines</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="relative border-2 rounded-xl p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30 hover:from-green-500/20 hover:to-green-600/20 hover:border-green-500/50 transition-all duration-300">
                    <RadioGroupItem value="checklist" id="checklist" className="absolute top-4 right-4" />
                    <Label htmlFor="checklist" className="cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20">
                          <Target className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">Checklist</p>
                          <p className="text-sm text-muted-foreground">Simple task lists</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {modality === "project" && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Target Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn(
                          "w-full h-12 justify-start text-base bg-gradient-to-r from-background/80 to-background/60 border-border/70", 
                          !date && "text-muted-foreground"
                        )}
                      > 
                        <CalendarIcon className="mr-3 h-5 w-5" />
                        {date ? format(date, "PPP") : "Choose a target date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <Button 
                className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-secondary hover:shadow-xl transition-all duration-300" 
                onClick={onCreate} 
                disabled={!title.trim()}
              >
                <Target className="mr-2 h-5 w-5" />
                Create Goal
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="goal_limit"
        title="Goal Limit Reached"
        description="You've reached your 2-goal limit. Upgrade to Pro for unlimited goals and advanced features."
      />

      <BottomNav />
    </div>
  );
};

export default CreateManualGoalScreen;
