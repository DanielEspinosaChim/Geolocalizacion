import { useState } from 'react';
import { Button, Combobox, Modal, ModalFooter, TextField, toast, type ComboboxOption } from '@shared/ui';
import { useAgregarProducto } from '../api/useCanastaMutations';
import { CATEGORIAS, type Categoria } from '../model/canasta';

/** Categorías como opciones del Combobox (el select global del sistema). */
const OPCIONES_CATEGORIA: ComboboxOption[] = CATEGORIAS.map((c) => ({ value: c, label: c }));

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
        <Combobox
          label="Categoría"
          options={OPCIONES_CATEGORIA}
          value={category}
          onChange={(v) => setCategory((v as Categoria) ?? CATEGORIAS[0])}
          clearable={false}
        />
        <TextField
          label="Presentación"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Ej. KILO, LITRO, 1 PZA"
        />
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button loading={agregar.isPending} onClick={guardar}>
          Agregar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
