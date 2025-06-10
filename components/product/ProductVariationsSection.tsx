import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Variation {
  size: string;
  pattern: string;
  price: number;
  is_active: boolean;
}

interface ProductVariationsSectionProps {
  hasVariations: boolean;
  setHasVariations: (value: boolean) => void;
  variations: Variation[];
  setVariations: (variations: Variation[]) => void;
}

export function ProductVariationsSection({
  hasVariations,
  setHasVariations,
  variations,
  setVariations
}: ProductVariationsSectionProps) {
  const handleVariationChange = (index: number, field: 'price' | 'is_active', value: string | number | boolean) => {
    const newVariations = [...variations];
    const variationToUpdate = { ...newVariations[index] };
  
    if (field === 'price') {
      variationToUpdate.price = Number(value);
    } else if (field === 'is_active') {
      variationToUpdate.is_active = !!value;
    }
  
    newVariations[index] = variationToUpdate;
    setVariations(newVariations);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Varyasyonlar</h3>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="hasVariations"
          checked={hasVariations}
          onCheckedChange={checked => setHasVariations(Boolean(checked))}
        />
        <label
          htmlFor="hasVariations"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Varyasyonlar var
        </label>
      </div>

      {hasVariations && (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Size</TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead className="w-[120px]">Fiyat</TableHead>
                <TableHead className="w-[80px]">Görünür</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variations.map((variation, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{variation.size}</TableCell>
                  <TableCell>{variation.pattern}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={variation.price === 0 ? '' : variation.price}
                      placeholder="Fiyat"
                      onChange={(e) => handleVariationChange(index, 'price', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={variation.is_active}
                      onCheckedChange={(checked) => handleVariationChange(index, 'is_active', checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 