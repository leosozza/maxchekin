# 📱 Guia de Instalação - MaxCheckin Nativo

## ✅ Configuração Completa!

O Capacitor já está configurado no projeto. Agora você pode gerar o APK para distribuição direta.

---

## 🚀 Próximos Passos

### 1️⃣ Exportar para o GitHub
1. Clique em **"Export to Github"** no Lovable
2. Faça `git pull` do projeto no seu computador

### 2️⃣ Instalar Dependências
```bash
npm install
```

### 3️⃣ Adicionar Plataformas

**Para Android (APK):**
```bash
npx cap add android
npx cap update android
```

**Para iOS (opcional, requer Mac + Xcode):**
```bash
npx cap add ios
npx cap update ios
```

### 4️⃣ Compilar o Projeto
```bash
npm run build
npx cap sync
```

### 5️⃣ Gerar APK

**Opção A: Android Studio (Recomendado)**
```bash
npx cap open android
```
Depois no Android Studio:
- `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
- O APK estará em: `android/app/build/outputs/apk/debug/app-debug.apk`

**Opção B: Linha de Comando**
```bash
cd android
./gradlew assembleDebug
cd ..
```

---

## 📦 Distribuir o APK

### 🔗 Método 1: Link Direto
1. Hospede o APK em algum servidor (Google Drive, Dropbox, etc.)
2. Compartilhe o link
3. Usuários baixam e instalam diretamente

**⚠️ Importante:** Usuários precisam permitir "Fontes Desconhecidas" nas configurações do Android

### 📱 Método 2: QR Code
1. Use um gerador de QR Code para o link do APK
2. Imprima ou mostre o QR Code
3. Usuários escaneiam e instalam

---

## 🎯 Recursos Nativos Habilitados

✅ **Câmera Nativa** - Scanner de QR Code funciona perfeitamente  
✅ **Offline First** - App funciona sem internet  
✅ **Performance** - Muito mais rápido que PWA  
✅ **Instalação Simples** - Apenas 1 arquivo APK  

---

## 🔄 Hot Reload Durante Desenvolvimento

O app está configurado para usar **hot reload** do Lovable durante desenvolvimento:
- Abre direto na URL: `https://a7815218-e413-42ee-96d4-c4c844565611.lovableproject.com`
- Todas as mudanças aparecem instantaneamente no app
- **Para produção**, você deve mudar isso no `capacitor.config.ts` e remover a propriedade `server`

---

## 📝 Notas Importantes

- **APK Debug**: Ideal para testes e distribuição direta
- **APK Release**: Para publicar na Google Play (requer assinatura digital)
- **Câmera**: No app nativo, a câmera funciona 100% (diferente do PWA)
- **Permissões**: O app pede permissão de câmera automaticamente

---

## 🆘 Problemas Comuns

**Erro ao compilar:**
- Certifique-se de ter o **Android Studio** instalado
- Java JDK 17 ou superior é necessário

**APK não instala:**
- Habilite "Fontes Desconhecidas" no Android
- Verifique se o APK não está corrompido

**Câmera não funciona:**
- Certifique-se de que as permissões foram concedidas
- Teste em um dispositivo real (não funciona em todos os emuladores)

---

## 📚 Recursos Adicionais

- [Documentação Capacitor](https://capacitorjs.com/docs)
- [Guia de Build Android](https://capacitorjs.com/docs/android)
- [Lovable + Capacitor](https://docs.lovable.dev/tips-tricks/capacitor)

---

**🎉 Seu app nativo está pronto para ser testado!**
