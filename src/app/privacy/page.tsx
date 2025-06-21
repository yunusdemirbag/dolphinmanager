export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg px-8 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Gizlilik Politikası
          </h1>
          
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              DolphinManager olarak kullanıcı gizliliğini ciddiye alıyoruz.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              1. Toplanan Bilgiler
            </h2>
            <p className="text-gray-600 mb-4">
              Sadece hizmet sunumu için gerekli bilgileri topluyoruz:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li>E-posta adresi</li>
              <li>Etsy API erişim bilgileri</li>
              <li>Mağaza verileri</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              2. Bilgilerin Kullanımı
            </h2>
            <p className="text-gray-600 mb-4">
              Bilgileriniz sadece size hizmet sunmak için kullanılır.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              3. Bilgi Güvenliği
            </h2>
            <p className="text-gray-600 mb-4">
              Verileriniz Firebase güvenlik standartlarıyla korunur.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              4. İletişim
            </h2>
            <p className="text-gray-600 mb-4">
              Gizlilik konularında bizimle iletişime geçebilirsiniz.
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