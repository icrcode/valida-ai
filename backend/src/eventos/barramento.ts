import { EventEmitter } from 'node:events';
import type { MapaEventos } from './tipos';

class BarramentoEventos extends EventEmitter {
  emitir<K extends keyof MapaEventos>(evento: K, payload: MapaEventos[K]): boolean {
    return this.emit(evento, payload);
  }

  ao<K extends keyof MapaEventos>(
    evento: K,
    handler: (payload: MapaEventos[K]) => void,
  ): this {
    return this.on(evento, handler);
  }
}

export const barramento = new BarramentoEventos();
