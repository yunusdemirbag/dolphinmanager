interface Variation {
  size: string;
  pattern: string;
  price: number;
  is_active: boolean;
}

export const predefinedVariations: Variation[] = [
  // 12"x8" - 30x20cm
  { size: '12"x8" - 30x20cm', pattern: 'Roll', price: 50, is_active: true },
  { size: '12"x8" - 30x20cm', pattern: 'StretchedWood Canvas', price: 90, is_active: true },
  { size: '12"x8" - 30x20cm', pattern: 'White Frame', price: 130, is_active: true },
  { size: '12"x8" - 30x20cm', pattern: 'Gold Frame', price: 130, is_active: true },
  { size: '12"x8" - 30x20cm', pattern: 'Silver Frame', price: 130, is_active: true },
  { size: '12"x8" - 30x20cm', pattern: 'Black Frame', price: 130, is_active: true },

  // 20"x14" - 50x35cm
  { size: '20"x14" - 50x35cm', pattern: 'Roll', price: 105, is_active: true },
  { size: '20"x14" - 50x35cm', pattern: 'StretchedWood Canvas', price: 190, is_active: true },
  { size: '20"x14" - 50x35cm', pattern: 'White Frame', price: 230, is_active: true },
  { size: '20"x14" - 50x35cm', pattern: 'Gold Frame', price: 230, is_active: true },
  { size: '20"x14" - 50x35cm', pattern: 'Silver Frame', price: 230, is_active: true },
  { size: '20"x14" - 50x35cm', pattern: 'Black Frame', price: 230, is_active: true },

  // 24"x16" - 60x40cm
  { size: '24"x16" - 60x40cm', pattern: 'Roll', price: 127, is_active: true },
  { size: '24"x16" - 60x40cm', pattern: 'StretchedWood Canvas', price: 230, is_active: true },
  { size: '24"x16" - 60x40cm', pattern: 'White Frame', price: 280, is_active: true },
  { size: '24"x16" - 60x40cm', pattern: 'Gold Frame', price: 280, is_active: true },
  { size: '24"x16" - 60x40cm', pattern: 'Silver Frame', price: 280, is_active: true },
  { size: '24"x16" - 60x40cm', pattern: 'Black Frame', price: 280, is_active: true },

  // 28"x20" - 70x50cm
  { size: '28"x20" - 70x50cm', pattern: 'Roll', price: 154, is_active: true },
  { size: '28"x20" - 70x50cm', pattern: 'StretchedWood Canvas', price: 280, is_active: true },
  { size: '28"x20" - 70x50cm', pattern: 'White Frame', price: 340, is_active: true },
  { size: '28"x20" - 70x50cm', pattern: 'Gold Frame', price: 340, is_active: true },
  { size: '28"x20" - 70x50cm', pattern: 'Silver Frame', price: 340, is_active: true },
  { size: '28"x20" - 70x50cm', pattern: 'Black Frame', price: 340, is_active: true },

  // 36"x24" - 90x60cm
  { size: '36"x24" - 90x60cm', pattern: 'Roll', price: 248, is_active: true },
  { size: '36"x24" - 90x60cm', pattern: 'StretchedWood Canvas', price: 450, is_active: true },
  { size: '36"x24" - 90x60cm', pattern: 'White Frame', price: 550, is_active: true },
  { size: '36"x24" - 90x60cm', pattern: 'Gold Frame', price: 550, is_active: true },
  { size: '36"x24" - 90x60cm', pattern: 'Silver Frame', price: 550, is_active: true },
  { size: '36"x24" - 90x60cm', pattern: 'Black Frame', price: 550, is_active: true },

  // 40"x28" - 100x70cm
  { size: '40"x28" - 100x70cm', pattern: 'Roll', price: 358, is_active: true },
  { size: '40"x28" - 100x70cm', pattern: 'StretchedWood Canvas', price: 650, is_active: true },
  { size: '40"x28" - 100x70cm', pattern: 'White Frame', price: 780, is_active: true },
  { size: '40"x28" - 100x70cm', pattern: 'Gold Frame', price: 780, is_active: true },
  { size: '40"x28" - 100x70cm', pattern: 'Silver Frame', price: 780, is_active: true },
  { size: '40"x28" - 100x70cm', pattern: 'Black Frame', price: 780, is_active: true },

  // 47"x31" - 120x80cm
  { size: '47"x31" - 120x80cm', pattern: 'Roll', price: 440, is_active: true },
  { size: '47"x31" - 120x80cm', pattern: 'StretchedWood Canvas', price: 800, is_active: true },
  { size: '47"x31" - 120x80cm', pattern: 'White Frame', price: 950, is_active: true },
  { size: '47"x31" - 120x80cm', pattern: 'Gold Frame', price: 950, is_active: true },
  { size: '47"x31" - 120x80cm', pattern: 'Silver Frame', price: 950, is_active: true },
  { size: '47"x31" - 120x80cm', pattern: 'Black Frame', price: 950, is_active: true },

  // 51"x35" - 130x90cm
  { size: '51"x35" - 130x90cm', pattern: 'Roll', price: 550, is_active: true },
  { size: '51"x35" - 130x90cm', pattern: 'StretchedWood Canvas', price: 1000, is_active: true },
  { size: '51"x35" - 130x90cm', pattern: 'White Frame', price: 1200, is_active: true },
  { size: '51"x35" - 130x90cm', pattern: 'Gold Frame', price: 1200, is_active: true },
  { size: '51"x35" - 130x90cm', pattern: 'Silver Frame', price: 1200, is_active: true },
  { size: '51"x35" - 130x90cm', pattern: 'Black Frame', price: 1200, is_active: true },

  // 60"x40" - 150x100cm
  { size: '60"x40" - 150x100cm', pattern: 'Roll', price: 963, is_active: true },
  { size: '60"x40" - 150x100cm', pattern: 'StretchedWood Canvas', price: 1750, is_active: true },
  { size: '60"x40" - 150x100cm', pattern: 'White Frame', price: 2000, is_active: true },
  { size: '60"x40" - 150x100cm', pattern: 'Gold Frame', price: 2000, is_active: true },
  { size: '60"x40" - 150x100cm', pattern: 'Silver Frame', price: 2000, is_active: true },
  { size: '60"x40" - 150x100cm', pattern: 'Black Frame', price: 2000, is_active: true },
];