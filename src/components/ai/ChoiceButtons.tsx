import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Choice {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  variant?: "default" | "outline" | "secondary";
}

interface ChoiceButtonsProps {
  choices: Choice[];
  onChoice: (choiceId: string) => void;
  title?: string;
  description?: string;
  className?: string;
}

const ChoiceButtons = ({ 
  choices, 
  onChoice, 
  title, 
  description, 
  className = "" 
}: ChoiceButtonsProps) => {
  return (
    <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 animate-fade-in ${className}`}>
      <CardContent className="p-4">
        {title && (
          <div className="mb-3">
            <h3 className="font-semibold text-lg">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-2">
          {choices.map((choice) => (
            <Button
              key={choice.id}
              variant={choice.variant || "outline"}
              onClick={() => onChoice(choice.id)}
              className="flex items-center justify-start gap-3 h-auto py-3 px-4 text-left hover:scale-105 transition-transform"
            >
              {choice.icon && (
                <span className="text-lg">{choice.icon}</span>
              )}
              <div className="flex-1">
                <p className="font-semibold">{choice.label}</p>
                {choice.description && (
                  <p className="text-sm opacity-80">{choice.description}</p>
                )}
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChoiceButtons;