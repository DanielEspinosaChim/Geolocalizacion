import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useCandidatos, type Candidato } from '@features/candidatos';
import { useCapas } from '@features/colonias-zonas';
import { MIN_PARADAS_RUTA as MIN_PARADAS } from '../model/ruta';
import { useCalcularRuta, useCalcularRutaColonia } from './useRuta';
import { useSeleccionRuta } from './useSeleccionRuta';

/**
 * Estado y acciones de la vista de rutas. Concentra toda la lógica (selección,
 * cálculo manual/por colonia, popup de parada, salto a registrar visita) para
 * que RutasPage quede como pura composición de UI.
 */
export function useControladorRuta() {
  // "Ver ruta" en una campaña navega aquí con los negocios (y su id) en el state.
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { rutaCampana?: string[]; campanaId?: string } | null;
  const rutaCampana = state?.rutaCampana;
  const campanaOrigen = state?.campanaId ?? null;

  const { data: candidatos = [] } = useCandidatos();
  const [parada, setParada] = useState<Candidato | null>(null);
  const [q, setQ] = useState('');
  const calcular = useCalcularRuta();
  const calcularColonia = useCalcularRutaColonia();
  const capas = useCapas();
  const seleccion = useSeleccionRuta(rutaCampana, calcular);
  const ruta = calcularColonia.data ?? calcular.data;
  const calculando = calcular.isPending || calcularColonia.isPending;

  // Al llegar desde una campaña, traza su ruta de una vez. La ref evita
  // recalcular en cada render mientras el state de navegación siga presente.
  const yaTrazada = useRef(false);
  useEffect(() => {
    if (rutaCampana && rutaCampana.length >= MIN_PARADAS && !yaTrazada.current) {
      yaTrazada.current = true;
      calcular.mutate(rutaCampana);
    }
  }, [rutaCampana, calcular]);

  function onParadaClick(placeId: string) {
    const candidato = candidatos.find((c) => c.place_id === placeId);
    if (candidato) setParada(candidato);
  }

  /** Desde una ruta de campaña: salta al detalle y abre el modal de visita. */
  function registrarVisita(placeId: string) {
    void navigate('/campanas', { state: { abrirCampana: campanaOrigen, registrarNegocio: placeId } });
  }

  return {
    candidatos,
    ruta,
    capas,
    calculando,
    q,
    setQ,
    parada,
    rutaCampana,
    campanaOrigen,
    ...seleccion,
    calcularColonia: (colonia: string, limite: number) => calcularColonia.mutate({ colonia, limite }),
    // Limpiar debe borrar TAMBIÉN la ruta calculada (distancia/tiempo), no solo
    // la selección: reseteamos ambas mutaciones para que RutaInfo desaparezca.
    limpiar: () => {
      seleccion.limpiar();
      calcular.reset();
      calcularColonia.reset();
    },
    onParadaClick,
    cerrarParada: () => setParada(null),
    registrarVisita,
  };
}
