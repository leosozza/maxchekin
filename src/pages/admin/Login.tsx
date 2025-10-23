import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, QrCode, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres" }),
});

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const { signIn, signUp, user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auto-redirect only admin users
  useEffect(() => {
    if (user && role === 'admin') {
      navigate('/admin/dashboard');
    }
  }, [user, role, navigate]);

  const validateForm = (isSignUp: boolean) => {
    const newErrors: typeof errors = {};
    
    const validation = authSchema.safeParse({ email, password });
    
    if (!validation.success) {
      validation.error.errors.forEach((error) => {
        if (error.path[0] === 'email') {
          newErrors.email = error.message;
        } else if (error.path[0] === 'password') {
          newErrors.password = error.message;
        }
      });
    }

    if (isSignUp && password !== confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(false)) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);

    if (!error) {
      // Aguardar role ser carregado
      setTimeout(() => {
        if (role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
          toast({
            title: "Acesso Negado",
            description: "Você não tem permissão de administrador.",
            variant: "destructive",
          });
        }
      }, 100);
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(true)) return;
    
    setIsLoading(true);
    const { error } = await signUp(email, password);

    if (!error) {
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-background p-4">
      {/* Botão Voltar ao Check-in */}
      <Button
        onClick={() => navigate('/')}
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all"
        title="Voltar ao Check-in"
      >
        <ArrowLeft className="w-5 h-5 text-primary" />
      </Button>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Check-in Visual */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-secondary/10 backdrop-blur-sm hover:border-primary/50 transition-all group">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <QrCode className="w-10 h-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Check-in de Modelos
            </CardTitle>
            <CardDescription className="text-muted-foreground text-lg">
              Escaneie o QR Code ou digite o ID manualmente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-card/50 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Sparkles className="w-5 h-5 text-primary" />
                <span>Scanner QR Code em tempo real</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Sparkles className="w-5 h-5 text-secondary" />
                <span>Busca manual de modelos</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Sparkles className="w-5 h-5 text-accent" />
                <span>Confirmação instantânea no Bitrix24</span>
              </div>
            </div>
            
            <Button
              onClick={() => navigate('/')}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all shadow-lg group-hover:shadow-primary/50"
            >
              <QrCode className="w-6 h-6 mr-2" />
              Iniciar Check-in
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Não é necessário fazer login para realizar check-in
            </p>
          </CardContent>
        </Card>

        {/* Painel de Login Admin */}
        <Card className="border-primary/20 bg-card/90 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-primary">MaxCheckin Admin</CardTitle>
            <CardDescription className="text-muted-foreground">
              Faça login ou crie uma conta para acessar o painel
            </CardDescription>
          </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup">
                Criar Conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors({});
                    }}
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors({});
                    }}
                    required
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors({});
                    }}
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors({});
                    }}
                    required
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors({});
                    }}
                    required
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Ao criar uma conta, você receberá um email de confirmação. Como estamos em desenvolvimento, a confirmação de email está desativada e você pode entrar imediatamente.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
