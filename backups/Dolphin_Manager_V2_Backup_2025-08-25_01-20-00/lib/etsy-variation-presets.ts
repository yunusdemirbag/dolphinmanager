interface Variation {
  size: string;
  pattern: string;
  price: number;
  is_active: boolean;
}

export const predefinedVariations: Variation[] = [
  // 8"x12" - 20x30 cm
  { size: '8"x12" - 20x30 cm', pattern: 'Roll', price: 80, is_active: true },
  { size: '8"x12" - 20x30 cm', pattern: 'Standard Canvas', price: 0, is_active: false },
  { size: '8"x12" - 20x30 cm', pattern: 'White Frame', price: 0, is_active: false },
  { size: '8"x12" - 20x30 cm', pattern: 'Gold Frame', price: 0, is_active: false },
  { size: '8"x12" - 20x30 cm', pattern: 'Silver Frame', price: 0, is_active: false },
  { size: '8"x12" - 20x30 cm', pattern: 'Black Frame', price: 0, is_active: false },

  // 14"x20" - 35x50cm
  { size: '14"x20" - 35x50cm', pattern: 'Roll', price: 90, is_active: true },
  { size: '14"x20" - 35x50cm', pattern: 'Standard Canvas', price: 130, is_active: true },
  { size: '14"x20" - 35x50cm', pattern: 'White Frame', price: 230, is_active: true },
  { size: '14"x20" - 35x50cm', pattern: 'Gold Frame', price: 230, is_active: true },
  { size: '14"x20" - 35x50cm', pattern: 'Silver Frame', price: 230, is_active: true },
  { size: '14"x20" - 35x50cm', pattern: 'Black Frame', price: 230, is_active: true },

  // 16"x24" - 40x60cm
  { size: '16"x24" - 40x60cm', pattern: 'Roll', price: 100, is_active: true },
  { size: '16"x24" - 40x60cm', pattern: 'Standard Canvas', price: 164, is_active: true },
  { size: '16"x24" - 40x60cm', pattern: 'White Frame', price: 280, is_active: true },
  { size: '16"x24" - 40x60cm', pattern: 'Gold Frame', price: 280, is_active: true },
  { size: '16"x24" - 40x60cm', pattern: 'Silver Frame', price: 280, is_active: true },
  { size: '16"x24" - 40x60cm', pattern: 'Black Frame', price: 280, is_active: true },

  // 20"x28" - 50x70cm
  { size: '20"x28" - 50x70cm', pattern: 'Roll', price: 150, is_active: true },
  { size: '20"x28" - 50x70cm', pattern: 'Standard Canvas', price: 250, is_active: true },
  { size: '20"x28" - 50x70cm', pattern: 'White Frame', price: 380, is_active: true },
  { size: '20"x28" - 50x70cm', pattern: 'Gold Frame', price: 380, is_active: true },
  { size: '20"x28" - 50x70cm', pattern: 'Silver Frame', price: 380, is_active: true },
  { size: '20"x28" - 50x70cm', pattern: 'Black Frame', price: 380, is_active: true },

  // 24"x36" - 60x90cm
  { size: '24"x36" - 60x90cm', pattern: 'Roll', price: 166, is_active: true },
  { size: '24"x36" - 60x90cm', pattern: 'Standard Canvas', price: 290, is_active: true },
  { size: '24"x36" - 60x90cm', pattern: 'White Frame', price: 574, is_active: true },
  { size: '24"x36" - 60x90cm', pattern: 'Gold Frame', price: 574, is_active: true },
  { size: '24"x36" - 60x90cm', pattern: 'Silver Frame', price: 574, is_active: true },
  { size: '24"x36" - 60x90cm', pattern: 'Black Frame', price: 574, is_active: true },

  // 28"x40" - 70x100cm
  { size: '28"x40" - 70x100cm', pattern: 'Roll', price: 220, is_active: true },
  { size: '28"x40" - 70x100cm', pattern: 'Standard Canvas', price: 420, is_active: true },
  { size: '28"x40" - 70x100cm', pattern: 'White Frame', price: 780, is_active: true },
  { size: '28"x40" - 70x100cm', pattern: 'Gold Frame', price: 780, is_active: true },
  { size: '28"x40" - 70x100cm', pattern: 'Silver Frame', price: 780, is_active: true },
  { size: '28"x40" - 70x100cm', pattern: 'Black Frame', price: 780, is_active: true },

  // 32"x48" - 80x120cm
  { size: '32"x48" - 80x120cm', pattern: 'Roll', price: 260, is_active: true },
  { size: '32"x48" - 80x120cm', pattern: 'Standard Canvas', price: 540, is_active: true },
  { size: '32"x48" - 80x120cm', pattern: 'White Frame', price: 1140, is_active: true },
  { size: '32"x48" - 80x120cm', pattern: 'Gold Frame', price: 1140, is_active: true },
  { size: '32"x48" - 80x120cm', pattern: 'Silver Frame', price: 1140, is_active: true },
  { size: '32"x48" - 80x120cm', pattern: 'Black Frame', price: 1140, is_active: true },

  // 36"x51" - 90x130cm
  { size: '36"x51" - 90x130cm', pattern: 'Roll', price: 320, is_active: true },
  { size: '36"x51" - 90x130cm', pattern: 'Standard Canvas', price: 980, is_active: true },
  { size: '36"x51" - 90x130cm', pattern: 'White Frame', price: 1440, is_active: true },
  { size: '36"x51" - 90x130cm', pattern: 'Gold Frame', price: 1440, is_active: true },
  { size: '36"x51" - 90x130cm', pattern: 'Silver Frame', price: 1440, is_active: true },
  { size: '36"x51" - 90x130cm', pattern: 'Black Frame', price: 1440, is_active: true },
];