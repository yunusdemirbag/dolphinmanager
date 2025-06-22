'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const { toast } = useToast()

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
      const token = await getAuthToken();
      const response = await fetch('/api/etsy/stores', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401) {
          setSessionExpired(true);
          setLoading(false);
          return;
      }

      if (!response.ok) {
        throw new Error('Mağazalar yüklenemedi.')
      }
      const data = await response.json()
      setStores(data.stores || [])
    } catch (error) {
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
      const token = await getAuthToken();
      const response = await fetch('/api/etsy/auth-url', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) {
        throw new Error('Etsy kimlik doğrulama URL\'si alınamadı.')
      }
      const data = await response.json()
      window.location.href = data.authUrl
    } catch (error) {
      toast({
        title: 'Hata',
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
      <Card>
        <CardHeader>
          <CardTitle>Etsy Mağazalarım</CardTitle>
          <CardDescription>
            Bağlı olan Etsy mağazalarınızı yönetin. Toplam 5 adete kadar mağaza bağlayabilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || authLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                 <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="flex flex-col gap-2">
                                <Skeleton className="h-4 w-[150px]" />
                                <Skeleton className="h-4 w-[100px]" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardFooter className="flex justify-end gap-2">
                         <Skeleton className="h-10 w-24" />
                         <Skeleton className="h-10 w-10" />
                    </CardFooter>
                </Card>
              ))}
            </div>
          ) : stores.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stores.map(store => (
                <Card key={store.shop_id} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {store.icon_url_fullxfull ? (
                                <img
                                src={store.icon_url_fullxfull}
                                alt={store.shop_name}
                                className="h-12 w-12 rounded-full"
                                />
                            ) : (
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-xl font-bold">
                                    {store.shop_name.charAt(0)}
                                </span>
                                </div>
                            )}
                            <div>
                                <CardTitle className="text-lg">{store.shop_name}</CardTitle>
                                <CardDescription>{store.listing_active_count} aktif ürün</CardDescription>
                            </div>
                        </div>
                         {store.url && (
                             <Button variant="ghost" size="icon" asChild>
                                <a href={store.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                             </Button>
                         )}
                    </div>
                  </CardHeader>
                  <CardFooter className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshToken(store.shop_id)}
                      disabled={isRefreshing === store.shop_id}
                    >
                      {isRefreshing === store.shop_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Yenile
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => confirmDisconnect(store)}
                      disabled={isDisconnecting === store.shop_id}
                    >
                      {isDisconnecting === store.shop_id ? <Loader2 className="mr-2 h-4 w-4 animate-pulse" /> : <Unplug className="mr-2 h-4 w-4" />}
                      Bağlantıyı Kes
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Hiçbir mağaza bağlı değil</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Yeni bir Etsy mağazası bağlayarak ürünlerinizi yönetmeye başlayın.
              </p>
            </div>
          )}
        </CardContent>
        {canAddStore && !loading && !authLoading && (
           <CardFooter className="border-t pt-6">
                <Button onClick={handleConnect} disabled={isConnecting || !canAddStore}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {isConnecting ? 'Yönlendiriliyor...' : 'Yeni Mağaza Bağla'}
                </Button>
            </CardFooter>
        )}
      </Card>
      
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              "{storeToDisconnect?.shop_name}" mağazasının bağlantısını kesmek üzeresiniz. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive hover:bg-destructive/90">
              {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Bağlantıyı Kes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 