'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Clock, User, Palette, MessageSquare, RotateCcw } from "lucide-react";
import { prompts, updatePrompt, resetPrompt, resetAllPrompts } from "@/lib/prompts";

export default function SettingsPage() {
  const [queueDelay, setQueueDelay] = useState(20);
  const [isSaving, setIsSaving] = useState(false);
  const [promptsState, setPromptsState] = useState(prompts);
  const [activeTab, setActiveTab] = useState('general');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Ayarları kaydetme işlemi
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Ayarlar kaydedildi');
    } catch (error) {
      console.error('Ayar kaydetme hatası:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromptUpdate = (promptId: string, newPrompt: string) => {
    updatePrompt(promptId, newPrompt);
    setPromptsState(prev => 
      prev.map(p => p.id === promptId ? { ...p, prompt: newPrompt } : p)
    );
  };

  const handlePromptReset = (promptId: string) => {
    resetPrompt(promptId);
    setPromptsState(prev => 
      prev.map(p => p.id === promptId ? { ...p, prompt: p.defaultPrompt } : p)
    );
  };

  const handleResetAllPrompts = () => {
    resetAllPrompts();
    setPromptsState(prev => 
      prev.map(p => ({ ...p, prompt: p.defaultPrompt }))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Ayarlar</h1>
        <p className="text-gray-600">Sistem ayarlarınızı yapılandırın</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">Genel Ayarlar</TabsTrigger>
          <TabsTrigger value="prompts">AI Promptları</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <CardTitle>Kuyruk Ayarları</CardTitle>
            </div>
            <CardDescription>
              Otomatik ürün gönderme kuyruğunun bekleme süresini ayarlayın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Bekleme Süresi (saniye)
              </label>
              <Input
                type="number"
                value={queueDelay}
                onChange={(e) => setQueueDelay(Number(e.target.value))}
                min="5"
                max="300"
                className="w-32"
              />
              <p className="text-xs text-gray-500 mt-1">
                5-300 saniye arası değer girebilirsiniz
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <CardTitle>Profil Bilgileri</CardTitle>
            </div>
            <CardDescription>
              Profil bilgilerinizi güncelleyin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Kullanıcı Adı
              </label>
              <Input placeholder="Kullanıcı adınız" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                E-posta
              </label>
              <Input type="email" placeholder="E-posta adresiniz" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <CardTitle>Tema Tercihleri</CardTitle>
            </div>
            <CardDescription>
              Arayüz temasını seçin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button variant="outline" className="flex-1">
                Açık Tema
              </Button>
              <Button variant="ghost" className="flex-1" disabled>
                Koyu Tema
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Şu anda sadece açık tema desteklenmektedir
            </p>
          </CardContent>
        </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">AI Promptları</h2>
              <p className="text-gray-600">OpenAI API çağrıları için kullanılan promptları özelleştirin</p>
            </div>
            <Button onClick={handleResetAllPrompts} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Tümünü Sıfırla
            </Button>
          </div>

          <div className="grid gap-6">
            {promptsState.map((prompt) => (
              <Card key={prompt.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5" />
                      <div>
                        <CardTitle className="text-lg">{prompt.name}</CardTitle>
                        <CardDescription>{prompt.description}</CardDescription>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handlePromptReset(prompt.id)} 
                      variant="outline" 
                      size="sm"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Sıfırla
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Prompt İçeriği
                      </label>
                      <Textarea
                        value={prompt.prompt}
                        onChange={(e) => handlePromptUpdate(prompt.id, e.target.value)}
                        placeholder="Prompt içeriğini girin..."
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Değişkenler: ${`{title}`}, ${`{categoryNames}`} gibi değişkenler kullanabilirsiniz
                      </p>
                    </div>
                    
                    {prompt.prompt !== prompt.defaultPrompt && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Bu prompt varsayılan ayarlardan farklı. Sıfırla butonuna basarak varsayılan haline döndürebilirsiniz.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Kaydediliyor...' : 'Promptları Kaydet'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}