import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Sparkles } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CreateManualGoalScreen = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [modality, setModality] = useState<"project" | "checklist">("project");
  const [date, setDate] = useState<Date | undefined>();

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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">New Goal</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-28 space-y-6">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Choose how to start</CardTitle>
            <CardDescription>Pick AI or go fully manual</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="h-20" onClick={() => navigate("/goals/ai")}> 
              <Sparkles className="mr-2" /> Use AI Planner
            </Button>
            <Button className="h-20" onClick={() => setShowForm(true)}>
              ✍️ Start with a Blank Goal
            </Button>
          </CardContent>
        </Card>

        {showForm && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Goal details</CardTitle>
              <CardDescription>Fill the essentials to get rolling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Goal title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Learn SwiftUI" />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <RadioGroup value={modality} onValueChange={(v) => setModality(v as any)} className="grid grid-cols-2 gap-2">
                  <div className="border rounded-md p-3">
                    <RadioGroupItem value="project" id="project" className="mr-2" />
                    <Label htmlFor="project">Project</Label>
                  </div>
                  <div className="border rounded-md p-3">
                    <RadioGroupItem value="checklist" id="checklist" className="mr-2" />
                    <Label htmlFor="checklist">Checklist</Label>
                  </div>
                </RadioGroup>
              </div>

              {modality === "project" && (
                <div className="space-y-2">
                  <Label>Target date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start", !date && "text-muted-foreground")}> 
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <Button className="w-full h-12 text-base" onClick={onCreate} disabled={!title.trim()}>Create Goal</Button>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default CreateManualGoalScreen;
