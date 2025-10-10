import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Smartphone, Download, QrCode } from "lucide-react";

export default function AppDownload() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-studio-dark via-background to-studio-dark p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-gold hover:text-gold/80"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-white">Baixar Aplicativo</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-studio-dark border-gold/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gold/10 rounded-lg">
                  <Smartphone className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <CardTitle className="text-white">Aplicativo PWA</CardTitle>
                  <CardDescription className="text-white/60">
                    Instalar diretamente do navegador
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-black/20 rounded-lg p-4 border border-gold/10">
                <h4 className="text-sm font-semibold text-gold mb-2">Como Instalar:</h4>
                <ol className="text-sm text-white/70 space-y-2 list-decimal list-inside">
                  <li>Abra este site no navegador do seu celular</li>
                  <li>No Chrome: Toque no menu (⋮) → "Instalar app"</li>
                  <li>No Safari: Toque em compartilhar → "Adicionar à Tela Inicial"</li>
                  <li>O app será instalado como aplicativo nativo</li>
                </ol>
              </div>

              <div className="flex items-center justify-center p-8 bg-white rounded-lg">
                <div className="text-center">
                  <QrCode className="w-32 h-32 mx-auto text-black mb-2" />
                  <p className="text-sm text-black/60">Escaneie para abrir no celular</p>
                </div>
              </div>

              <p className="text-xs text-white/40 text-center">
                QR Code com a URL do aplicativo será gerado automaticamente
              </p>
            </CardContent>
          </Card>

          <Card className="bg-studio-dark border-gold/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gold/10 rounded-lg">
                  <Download className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <CardTitle className="text-white">Lojas de Aplicativos</CardTitle>
                  <CardDescription className="text-white/60">
                    Versões nativas para iOS e Android
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-black/20 rounded-lg p-4 border border-gold/10">
                <h4 className="text-sm font-semibold text-gold mb-3">Download Direto:</h4>
                
                <div className="space-y-3">
                  <Button
                    className="w-full bg-black text-white hover:bg-black/80 justify-start"
                    onClick={() => window.open('#', '_blank')}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    App Store
                  </Button>

                  <Button
                    className="w-full bg-green-600 text-white hover:bg-green-700 justify-start"
                    onClick={() => window.open('#', '_blank')}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    Google Play
                  </Button>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-400">
                  ℹ️ As URLs das lojas podem ser configuradas em <strong>Admin → Configurações</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-studio-dark border-gold/20">
          <CardHeader>
            <CardTitle className="text-white">Vantagens do Aplicativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
                <h4 className="font-semibold text-white">Acesso Rápido</h4>
                <p className="text-sm text-white/60">
                  Abra direto da tela inicial, sem precisar do navegador
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📱</span>
                </div>
                <h4 className="font-semibold text-white">Experiência Nativa</h4>
                <p className="text-sm text-white/60">
                  Interface otimizada para dispositivos móveis
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🔔</span>
                </div>
                <h4 className="font-semibold text-white">Notificações</h4>
                <p className="text-sm text-white/60">
                  Receba alertas de novas chamadas em tempo real
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
