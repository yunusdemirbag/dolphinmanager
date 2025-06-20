export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg px-8 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Kullanım Şartları
          </h1>
          
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              Bu kullanım şartları, DolphinManager hizmetinin kullanımını düzenler.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              1. Hizmet Kullanımı
            </h2>
            <p className="text-gray-600 mb-4">
              DolphinManager, Etsy mağaza yönetimi için bir araçtır. Hizmeti kötüye kullanmak yasaktır.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              2. Kullanıcı Sorumlulukları
            </h2>
            <p className="text-gray-600 mb-4">
              Kullanıcılar, hesap bilgilerinin güvenliğinden sorumludur.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              3. Gizlilik
            </h2>
            <p className="text-gray-600 mb-4">
              Kullanıcı verilerinin korunması önceliğimizdir.
            </p>
            
            <p className="text-sm text-gray-500 mt-8">
              Son güncelleme: 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}