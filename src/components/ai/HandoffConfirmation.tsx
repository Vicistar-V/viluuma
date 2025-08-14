import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Target, Calendar as CalendarIconLucide, FileText, Edit3 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Intel {
  title: string;
  modality: "project" | "checklist";
  deadline?: string | null;
  context: string;
}

interface UserConstraints {
  deadline?: string | null;
  hoursPerWeek: number;
}

interface HandoffConfirmationProps {
  intel: Intel;
  userConstraints: UserConstraints;
  onConfirm: (updatedIntel: Intel, updatedConstraints: UserConstraints) => void;
  onStartOver: () => void;
  isLoading?: boolean;
}

const HandoffConfirmation = ({ 
  intel, 
  userConstraints, 
  onConfirm, 
  onStartOver, 
  isLoading = false 
}: HandoffConfirmationProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedIntel, setEditedIntel] = useState<Intel>(intel);
  const [editedConstraints, setEditedConstraints] = useState<UserConstraints>(userConstraints);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    intel.deadline ? new Date(intel.deadline) : undefined
  );

  const handleEditSave = () => {
    const updatedIntel = {
      ...editedIntel,
      deadline: selectedDate ? selectedDate.toISOString() : null
    };
    
    const updatedConstraints = {
      ...editedConstraints,
      deadline: selectedDate ? selectedDate.toISOString() : null
    };

    setShowEditModal(false);
    onConfirm(updatedIntel, updatedConstraints);
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return "No specific deadline";
    try {
      return format(new Date(deadline), "MMMM d, yyyy");
    } catch {
      return deadline;
    }
  };

  const getModalityDisplay = (modality: string) => {
    return modality === "project" ? "Project" : "Checklist";
  };

  const getModalityIcon = (modality: string) => {
    return modality === "project" ? CalendarIconLucide : FileText;
  };

  const ModalityIcon = getModalityIcon(intel.modality);

  return (
    <>
      <Card className="mx-4 mb-4 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Goal Briefing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Goal Title */}
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-semibold text-primary">🎯</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">GOAL</p>
              <p className="font-semibold">{intel.title}</p>
            </div>
          </div>

          {/* Goal Type */}
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10">
              <ModalityIcon className="h-4 w-4 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">TYPE</p>
              <p className="font-semibold">{getModalityDisplay(intel.modality)}</p>
            </div>
          </div>

          {/* Deadline (if applicable) */}
          {intel.modality === "project" && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                <span className="text-sm font-semibold">🏁</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">TARGET</p>
                <p className="font-semibold">{formatDeadline(intel.deadline)}</p>
              </div>
            </div>
          )}

          {/* Context/Notes */}
          {intel.context && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50">
                <span className="text-sm font-semibold">📝</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">NOTES</p>
                <p className="text-sm text-muted-foreground">{intel.context}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={() => onConfirm(intel, userConstraints)}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? "Building Your Plan..." : "✅ Yes, Build My Plan!"}
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowEditModal(true)}
                disabled={isLoading}
                className="flex-1"
                size="sm"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Make a Tweak
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={onStartOver}
                disabled={isLoading}
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Start Over
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Goal Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Goal Title</Label>
              <Input
                id="title"
                value={editedIntel.title}
                onChange={(e) => setEditedIntel(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What do you want to achieve?"
              />
            </div>

            {/* Modality */}
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <Select 
                value={editedIntel.modality} 
                onValueChange={(value: "project" | "checklist") => 
                  setEditedIntel(prev => ({ ...prev, modality: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project (with deadline)</SelectItem>
                  <SelectItem value="checklist">Checklist (no deadline)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Deadline (if project) */}
            {editedIntel.modality === "project" && (
              <div className="space-y-2">
                <Label>Target Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Context */}
            <div className="space-y-2">
              <Label htmlFor="context">Additional Notes</Label>
              <Textarea
                id="context"
                value={editedIntel.context}
                onChange={(e) => setEditedIntel(prev => ({ ...prev, context: e.target.value }))}
                placeholder="Any additional context or details..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowEditModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditSave}
              className="flex-1"
            >
              Update Briefing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HandoffConfirmation;