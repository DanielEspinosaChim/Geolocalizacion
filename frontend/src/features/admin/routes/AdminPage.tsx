import { useState } from 'react';
import {
  Button,
  Page,
  PageHeader,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@shared/ui';
import { useSession } from '@features/auth';
import { useCampanas } from '@features/campanas';
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
    <Page width="wide" className="grid gap-6">
      <PageHeader
        eyebrow="Panel de control"
        title="Administración"
        description="Usuarios, roles y asignación de campañas a los técnicos"
      />

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
    </Page>
  );
}
