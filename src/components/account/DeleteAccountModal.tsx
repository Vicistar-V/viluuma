import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DeleteAccountModal = ({ isOpen, onOpenChange, onSuccess }: DeleteAccountModalProps) => {
  const [step, setStep] = useState<'warning' | 'confirmation' | 'deleting'>('warning');
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const resetModal = () => {
    setStep('warning');
    setConfirmationText('');
    setIsDeleting(false);
  };

  const handleClose = () => {
    if (!isDeleting) {
      resetModal();
      onOpenChange(false);
    }
  };

  const handleProceedToConfirmation = () => {
    setStep('confirmation');
  };

  const handleDeleteAccount = async () => {
    if (confirmationText !== 'DELETE') {
      toast({
        title: "Confirmation Required",
        description: "Please type DELETE to confirm account deletion",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    setStep('deleting');

    try {
      // Call the edge function to delete the entire account
      const { data, error } = await supabase.functions.invoke('delete-user-account');

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete account');
      }

      toast({
        title: "Account Deleted",
        description: "Your account and all data have been permanently deleted"
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive"
      });
      setStep('warning');
      setIsDeleting(false);
    }
  };

  const isConfirmationValid = confirmationText === 'DELETE';

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
          </div>
          
          {step === 'warning' && (
            <AlertDialogDescription className="space-y-3">
              <p>This action will permanently delete your account and all associated data, including:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All your goals and milestones</li>
                <li>All your tasks and progress</li>
                <li>Your profile information</li>
                <li>All account settings</li>
              </ul>
              <p className="font-semibold text-destructive">
                This action cannot be undone. Your data will be permanently lost.
              </p>
            </AlertDialogDescription>
          )}

          {step === 'confirmation' && (
            <AlertDialogDescription className="space-y-4">
              <p>To confirm deletion, please type <strong>DELETE</strong> below:</p>
              <div className="space-y-2">
                <Label htmlFor="confirmation">Type DELETE to confirm</Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          )}

          {step === 'deleting' && (
            <AlertDialogDescription>
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
                <span>Deleting your account and all data...</span>
              </div>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          {step === 'warning' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleProceedToConfirmation}>
                Continue
              </Button>
            </>
          )}

          {step === 'confirmation' && (
            <>
              <Button variant="outline" onClick={() => setStep('warning')}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={!isConfirmationValid}
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Account</span>
              </Button>
            </>
          )}

          {step === 'deleting' && (
            <Button variant="destructive" disabled>
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Deleting...</span>
              </div>
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};