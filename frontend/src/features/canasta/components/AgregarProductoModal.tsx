import { useState } from 'react';
import { Button, Modal, ModalFooter, SelectField, TextField, toast } from '@shared/ui';
import { useAgregarProducto } from '../api/useCanastaMutations';
import { CATEGORIAS, type Categoria } from '../model/canasta';

interface AgregarProductoModalProps {
  year: string;
  open: boolean;
  onClose: () => void;
}

export function AgregarProductoModal({ year, open, onClose }: AgregarProductoModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Categoria>(CATEGORIAS[0]);
  const [unit, setUnit] = useState('');
  const agregar = useAgregarProducto(year);

  function guardar() {
    if (!name.trim()) {
      toast.error('El nombre es requerido.');
      return;
    }
    agregar.mutate(
      { name: name.trim(), category, unit: unit.trim() },
      {
        onSuccess: () => {
          toast.success('Producto agregado.');
          setName('');
          setUnit('');
          onClose();
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={`Agregar producto · ${year}`} width="sm">
      <div className="grid gap-3">
        <TextField
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. PAPAYA"
        />
        <SelectField
          label="Categoría"
          value={category}
          onChange={(e) => setCategory(e.target.value as Categoria)}
        >
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Presentación"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Ej. KILO, LITRO, 1 PZA"
        />
      </div>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button size="sm" loading={agregar.isPending} onClick={guardar}>
          Agregar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
