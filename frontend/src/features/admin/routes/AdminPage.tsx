import { useState } from 'react';
import { useSession } from '@features/auth';
import { useCampanas } from '@features/campanas';
import { Button, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui';
import { useUsuarios } from '../api/useUsuarios';
import { AsignacionesList } from '../components/AsignacionesList';
import { CrearUsuarioModal } from '../components/CrearUsuarioModal';
import { MiCuenta } from '../components/MiCuenta';
import { UsuariosList } from '../components/UsuariosList';

export function AdminPage() {
  const { user } = useSession();
  const { data: campanas = [] } = useCampanas({ status: null });
  const { data: usuarios = [], isPending } = useUsuarios();
  const [crearAbierto, setCrearAbierto] = useState(false);

  return (
    <div className="mx-auto grid max-w-4xl gap-4 overflow-y-auto p-4">
      {user ? <MiCuenta user={user} /> : null}

      <Tabs defaultValue="usuarios" className="grid gap-3">
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="asignaciones">Asignaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="grid gap-3">
          <div className="flex justify-end">
            <Button onClick={() => setCrearAbierto(true)}>+ Nuevo usuario</Button>
          </div>
          {isPending ? <Spinner label="Cargando usuarios…" /> : <UsuariosList campanas={campanas} />}
        </TabsContent>

        <TabsContent value="asignaciones">
          <AsignacionesList campanas={campanas} usuarios={usuarios} />
        </TabsContent>
      </Tabs>

      <CrearUsuarioModal open={crearAbierto} onClose={() => setCrearAbierto(false)} />
    </div>
  );
}
