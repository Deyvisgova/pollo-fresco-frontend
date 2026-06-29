import { Injectable, signal } from '@angular/core';

export interface ConfirmacionOpciones {
  titulo?: string;
  mensaje: string;
  detalle?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  tipo?: 'peligro' | 'advertencia' | 'normal';
}

interface ConfirmacionActiva extends Required<Omit<ConfirmacionOpciones, 'detalle'>> {
  detalle: string;
  resolver: (valor: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmacionServicio {
  private readonly dialogoSignal = signal<ConfirmacionActiva | null>(null);
  readonly dialogo = this.dialogoSignal.asReadonly();

  confirmar(opciones: ConfirmacionOpciones): Promise<boolean> {
    return new Promise((resolver) => {
      this.dialogoSignal.set({
        titulo: opciones.titulo ?? 'Confirmar accion',
        mensaje: opciones.mensaje,
        detalle: opciones.detalle ?? '',
        textoConfirmar: opciones.textoConfirmar ?? 'Confirmar',
        textoCancelar: opciones.textoCancelar ?? 'Cancelar',
        tipo: opciones.tipo ?? 'normal',
        resolver
      });
    });
  }

  aceptar(): void {
    this.resolver(true);
  }

  cancelar(): void {
    this.resolver(false);
  }

  private resolver(valor: boolean): void {
    const dialogo = this.dialogoSignal();
    if (!dialogo) {
      return;
    }

    this.dialogoSignal.set(null);
    dialogo.resolver(valor);
  }
}
