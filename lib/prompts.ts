// Etsy ürün başlık, açıklama ve etiket oluşturma promptları
// Bu dosya OpenAI API için kullanılan promptları içerir ve ayarlar sayfasından düzenlenebilir

export interface PromptConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  defaultPrompt: string; // Orijinal prompt (reset için)
}

// Başlık oluşturma promptu
export const titlePrompt: PromptConfig = {
  id: "title-prompt",
  name: "Başlık Oluşturma Promptu",
  description: "Görsel yüklendiğinde ürün başlığı oluşturmak için kullanılan prompt",
  prompt: "Yüklenen görseli detaylı analiz et ve SADECE bu görsele uygun, SEO uyumlu bir Etsy ürün başlığı üret. Başlık dışında hiçbir açıklama veya ek metin yazma. Başlıkta marka, ölçü, fiyat veya gereksiz kelimeler olmasın.",
  defaultPrompt: "GÖREV: Aşağıdaki görseli analiz et ve sadece bu görsele uygun, SEO uyumlu, yüksek dönüşüm sağlayacak tek bir Etsy ürün başlığı üret. Sadece başlığı döndür. Başlıkta marka, ölçü, fiyat veya gereksiz kelimeler olmasın."
};

// Açıklama oluşturma promptu
export const descriptionPrompt: PromptConfig = {
  id: "description-prompt",
  name: "Açıklama Oluşturma Promptu",
  description: "Ürün başlığına göre otomatik açıklama oluşturmak için kullanılan prompt (${title} değişkeni ile başlık eklenir)",
  prompt: "Bu başlığa sahip bir tuval duvar sanatı baskısı için SEO uyumlu, çekici bir Etsy ürün açıklaması oluştur: \"${title}\". Sadece açıklamayı döndür, başka hiçbir metin ekleme.",
  defaultPrompt: "TASK: Generate a captivating, SEO-optimized Etsy product description for a physical canvas wall art print based on the provided product title."
};

// Etiket oluşturma promptu
export const tagsPrompt: PromptConfig = {
  id: "tags-prompt",
  name: "Etiket Oluşturma Promptu",
  description: "Ürün başlığına göre etiket oluşturmak için kullanılan prompt (${title} değişkeni ile başlık eklenir)",
  prompt: "Bu başlığa sahip bir tuval duvar sanatı baskısı için tam olarak 13 adet Etsy etiketi oluştur: \"${title}\". Her etiket en fazla 19 karakter olmalı, tümü küçük harfli İngilizce olmalı. Etiketleri virgülle ayırarak tek satırda döndür. Başka hiçbir metin veya açıklama ekleme.",
  defaultPrompt: "TASK: Generate a hyper-optimized list of 13 Etsy tags for a physical canvas wall art print, based on the provided product title."
};

// Kategori seçme promptu
export const categoryPrompt: PromptConfig = {
  id: "category-prompt",
  name: "Kategori Seçme Promptu",
  description: "Ürün başlığına göre mağaza kategorisi seçmek için kullanılan prompt (${title} ve ${categoryNames} değişkenleri eklenir)",
  prompt: "Aşağıdaki ürün başlığına en uygun mağaza kategorisini sadece aşağıdaki seçeneklerden birini seçerek döndür. Sadece kategori adını döndür, başka hiçbir metin yazma: ${categoryNames}",
  defaultPrompt: "Aşağıdaki ürün başlığına en uygun mağaza kategorisini sadece aşağıdaki seçeneklerden birini seçerek döndür. Sadece kategori adını döndür."
};

// Tüm promptları içeren koleksiyon
export const prompts: PromptConfig[] = [
  titlePrompt,
  descriptionPrompt,
  tagsPrompt,
  categoryPrompt
];

// ID'ye göre prompt getirme fonksiyonu
export function getPromptById(id: string): PromptConfig | undefined {
  return prompts.find(p => p.id === id);
}

// Prompt güncelleme fonksiyonu
export function updatePrompt(id: string, newPrompt: string): void {
  const promptIndex = prompts.findIndex(p => p.id === id);
  if (promptIndex !== -1) {
    prompts[promptIndex].prompt = newPrompt;
  }
}

// Prompt sıfırlama fonksiyonu
export function resetPrompt(id: string): void {
  const promptIndex = prompts.findIndex(p => p.id === id);
  if (promptIndex !== -1) {
    prompts[promptIndex].prompt = prompts[promptIndex].defaultPrompt;
  }
}
