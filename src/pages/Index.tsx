import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Smartphone, UserPlus, LogIn } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome</h1>
              <p className="text-lg text-muted-foreground">
                Get started with your mobile app experience
              </p>
            </div>
          </div>

          {/* Authentication Options */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Create an account or sign in to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full h-12 text-base font-medium">
                <Link to="/signup">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full h-12 text-base font-medium">
                <Link to="/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Features Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's Inside</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  Secure authentication system
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  Mobile-optimized interface
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                  Protected user dashboard
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
