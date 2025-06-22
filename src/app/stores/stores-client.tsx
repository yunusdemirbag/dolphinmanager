'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { PlusCircle, RefreshCw, XCircle, ExternalLink, Unplug, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertTitle, AlertDescription as UIAlertDescription } from "@/components/ui/alert"

interface EtsyStore {
  shop_id: number;
  shop_name: string;
  user_id: string;
  create_date: number;
  listing_active_count: number;
  icon_url_fullxfull?: string;
  url?: string;
  currency_code?: string;
  is_vacation?: boolean;
  title?: string;
  image_url_760x100?: string;
}

// URL parametrelerini kontrol eden bileşen
function StoresUrlHandler({ onError, onSuccess }: { 
  onError: (error: string, details?: string) => void,
  onSuccess: (shopName?: string) => void
}) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    const detailsParam = params.get('details');
    const successParam = params.get('success');
    const connectedParam = params.get('etsy_connected');

    if (errorParam) {
      console.error('Etsy error from URL:', errorParam, detailsParam);
      onError(errorParam, detailsParam || undefined);
      
      // URL'den parametreleri temizle
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      newUrl.searchParams.delete('details');
      window.history.replaceState({}, '', newUrl);
    } else if (successParam || connectedParam) {
      onSuccess(connectedParam || undefined);
      
      // URL'den parametreleri temizle
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('success');
      newUrl.searchParams.delete('etsy_connected');
      window.history.replaceState({}, '', newUrl);
    }
  }, [onError, onSuccess]);

  return null;
}

export default function StoresClient() {
  const { user, loading: authLoading, getAuthToken } = useAuth();
  const [stores, setStores] = useState<EtsyStore[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState<number | null>(null)
  const [isDisconnecting, setIsDisconnecting] = useState<number | null>(null)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [storeToDisconnect, setStoreToDisconnect] = useState<EtsyStore | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast()

  const handleUrlError = useCallback((errorMsg: string, details?: string) => {
    toast({
      title: 'Etsy Bağlantı Hatası',
      description: details || errorMsg,
      variant: 'destructive',
    });
  }, [toast]);

  const handleUrlSuccess = useCallback((shopName?: string) => {
    if (shopName) {
      toast({
        title: 'Başarılı',
        description: `${shopName} mağazası başarıyla bağlandı.`,
      });
    } else {
      toast({
        title: 'Başarılı',
        description: 'Etsy mağazası başarıyla bağlandı.',
      });
    }
  }, [toast]);

  const fetchStores = useCallback(async () => {
    if (!user) {
        if (!authLoading) {
            setSessionExpired(true);
            setLoading(false);
        }
        return;
    }

    try {
      setLoading(true)
      setError(null);
      console.log('Fetching Etsy stores...');
      
      const token = await getAuthToken();
      console.log('Auth token obtained');
      
      const response = await fetch('/api/etsy/stores', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401) {
          console.log('Unauthorized: Session expired');
          setSessionExpired(true);
          setLoading(false);
          return;
      }

      if (!response.ok) {
        throw new Error('Mağazalar yüklenemedi.')
      }
      
      const data = await response.json()
      console.log('Stores API response:', data);
      
      if (data.success === false && data.code === 'NO_STORES') {
        console.log('No stores found for user');
        setStores([]);
      } else if (data.stores && Array.isArray(data.stores)) {
        console.log(`Found ${data.stores.length} stores`);
        setStores(data.stores);
      } else {
        console.error('Invalid API response format:', data);
        setError('API yanıtı geçersiz format içeriyor.');
        setStores([]);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setError(error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.');
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [user, authLoading, getAuthToken, toast]);

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      console.log('Getting Etsy auth URL...');
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Kimlik doğrulama tokenı bulunamadı.');
      }

      const response = await fetch('/api/etsy/auth-url', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to get auth URL:', data);
        throw new Error(data.error || `Sunucu hatası: ${response.status}`);
      }
      
      if (data.url) {
        console.log('Redirecting to Etsy auth URL:', data.url);
        window.location.href = data.url
      } else {
        console.error('Auth URL not found in response:', data);
        throw new Error('Etsy kimlik doğrulama URL\'si yanıtta bulunamadı.');
      }
    } catch (error) {
      console.error('Error connecting to Etsy:', error);
      toast({
        title: 'Bağlantı Hatası',
        description: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.',
        variant: 'destructive',
      })
      setIsConnecting(false)
    }
  }

  const handleRefreshToken = async (shopId: number) => {
    setIsRefreshing(shopId)
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/etsy/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ shop_id: shopId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Token yenilenemedi.')
      }

      toast({
        title: 'Başarılı',
        description: 'Etsy mağaza bağlantısı başarıyla yenilendi.',
      })
      fetchStores()
    } catch (error) {
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.',
        variant: 'destructive',
      })
    } finally {
      setIsRefreshing(null)
    }
  }

  const confirmDisconnect = (store: EtsyStore) => {
    setStoreToDisconnect(store)
    setShowDisconnectDialog(true)
  }

  const handleDisconnect = async () => {
    if (!storeToDisconnect) return
    
    const shopId = storeToDisconnect.shop_id
    setIsDisconnecting(shopId)
    setShowDisconnectDialog(false)

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/etsy/stores/${shopId}/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Mağaza bağlantısı kesilemedi.')
      }

      toast({
        title: 'Başarılı',
        description: `${storeToDisconnect.shop_name} mağazasının bağlantısı kesildi.`,
      })
      setStores(prevStores => prevStores.filter(s => s.shop_id !== shopId))
    } catch (error) {
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.',
        variant: 'destructive',
      })
    } finally {
      setIsDisconnecting(null)
      setStoreToDisconnect(null)
    }
  }
  
  if (sessionExpired) {
    return (
      <div className="container mx-auto p-4 md:p-6 flex justify-center items-center h-96">
        <Alert variant="destructive" className="w-full max-w-md">
            <AlertTitle>Oturumunuz Sona Erdi</AlertTitle>
            <UIAlertDescription>
                Lütfen mağazalarınızı yönetmek için tekrar giriş yapın.
            </UIAlertDescription>
            <Button className="mt-4 w-full" onClick={() => window.location.href = '/login'}>
                Giriş Yap
            </Button>
        </Alert>
      </div>
    )
  }

  const canAddStore = stores.length < 5

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* URL parametrelerini işleyen bileşen */}
      <Suspense fallback={null}>
        <StoresUrlHandler onError={handleUrlError} onSuccess={handleUrlSuccess} />
      </Suspense>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Etsy Mağazalarım</h1>
          <p className="text-muted-foreground">Etsy mağazalarınızı bağlayın ve yönetin</p>
        </div>
        <Button 
          onClick={handleConnect} 
          disabled={isConnecting}
          className="flex items-center gap-2"
        >
          {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          <span>Mağaza Bağla</span>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Hata</AlertTitle>
          <UIAlertDescription>{error}</UIAlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Yükleme durumu
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))
        ) : stores.length === 0 ? (
          // Mağaza yok
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Henüz Mağaza Bağlanmadı</CardTitle>
              <CardDescription>
                Etsy mağazanızı bağlamak için "Mağaza Bağla" butonuna tıklayın.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Mağazanızı bağladıktan sonra ürünlerinizi yönetebilir, siparişlerinizi takip edebilir ve daha fazlasını yapabilirsiniz.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleConnect} 
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2"
              >
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                <span>Mağaza Bağla</span>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          // Mağazalar
          stores.map((store) => (
            <Card key={store.shop_id}>
              <CardHeader>
                <CardTitle>{store.shop_name}</CardTitle>
                <CardDescription>
                  {store.listing_active_count} aktif ürün
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center gap-4">
                    {store.icon_url_fullxfull ? (
                      <img 
                        src={store.icon_url_fullxfull} 
                        alt={`${store.shop_name} icon`}
                        className="h-16 w-auto object-cover rounded"
                      />
                    ) : (
                      <div className="h-16 w-32 bg-muted rounded flex items-center justify-center">
                        <span className="text-xl font-bold">
                          {store.shop_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{store.shop_name}</p>
                      <p className="text-sm text-muted-foreground">ID: {store.shop_id}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Para Birimi</p>
                      <p>{store.currency_code || 'USD'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Durum</p>
                      <p>{store.is_vacation ? 'Tatil Modu' : 'Aktif'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(store.url || `https://www.etsy.com/shop/${store.shop_name}`, '_blank')}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Ziyaret Et</span>
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRefreshToken(store.shop_id)}
                    disabled={isRefreshing === store.shop_id}
                    className="flex items-center gap-1"
                  >
                    {isRefreshing === store.shop_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    <span>Yenile</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => confirmDisconnect(store)}
                    disabled={isDisconnecting === store.shop_id}
                    className="flex items-center gap-1 text-destructive hover:text-destructive"
                  >
                    {isDisconnecting === store.shop_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Unplug className="h-3 w-3" />
                    )}
                    <span>Bağlantıyı Kes</span>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mağaza Bağlantısını Kes</AlertDialogTitle>
            <AlertDialogDescription>
              {storeToDisconnect && (
                <>
                  <p><strong>{storeToDisconnect.shop_name}</strong> mağazasının bağlantısını kesmek istediğinizden emin misiniz?</p>
                  <p className="mt-2">Bu işlem mağazanızın verilerini sistemden silecektir. Dilediğiniz zaman tekrar bağlayabilirsiniz.</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive hover:bg-destructive/90">
              Bağlantıyı Kes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 