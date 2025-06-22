'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function EtsyTestPage() {
  const { user, loading: authLoading, getAuthToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const testEtsyApi = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/etsy/test-shops', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'API isteği başarısız oldu');
      }

      const responseData = await response.json();
      setData(responseData);
    } catch (err) {
      console.error('Error testing Etsy API:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Yetkisiz Erişim</AlertTitle>
          <AlertDescription>
            Bu sayfayı görüntülemek için giriş yapmalısınız.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Etsy API Test Sayfası</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Etsy API Testi</CardTitle>
          <CardDescription>
            Bu sayfada Etsy API bağlantısını test edebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {data && (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Token Bilgileri</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                  {JSON.stringify(data.tokenInfo, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Kullanıcı Bilgileri</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                  {JSON.stringify(data.user, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Mağaza Bilgileri</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                  {JSON.stringify(data.shops, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Alternatif Mağaza Bilgileri</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                  {JSON.stringify(data.altShops, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={testEtsyApi} 
            disabled={loading}
            className="flex items-center"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test Ediliyor...
              </>
            ) : (
              'Etsy API Test Et'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 