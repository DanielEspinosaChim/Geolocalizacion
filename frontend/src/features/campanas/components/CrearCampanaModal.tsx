import { useState } from 'react';
import { Button, Modal, ModalFooter, TextField } from '@shared/ui';
import { ColoniaSelect } from '@features/colonias-zonas';
import { useCampanaMutations } from '../api/useCampanaMutations';

interface CrearCampanaModalProps {
  open: boolean;
  onClose: () => void;
}

export function CrearCampanaModal({ open, onClose }: CrearCampanaModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [colonia, setColonia] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const { crear } = useCampanaMutations(null);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    crear.mutate(
      { nombre, descripcion, colonia: colonia ?? '', fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      {
        onSuccess: () => {
          setNombre('');
          setDescripcion('');
          setColonia(null);
          setFechaInicio('');
          setFechaFin('');
          onClose();
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva campaña">
      <form onSubmit={enviar} className="grid gap-3">
        <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <TextField
          label="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <ColoniaSelect value={colonia} onChange={setColonia} label="Colonia (opcional)" />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          <TextField label="Fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={crear.isPending} disabled={!nombre}>
            Crear campaña
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
