import { Injectable, signal } from '@angular/core';

type Tema = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class TemaServicio {
  private readonly storageKey = 'pollo-fresco-private-theme';
  private readonly tema = signal<Tema>('light');

  constructor() {
    this.inicializarTema();
  }

  temaActual() {
    return this.tema.asReadonly();
  }

  alternarTema(): void {
    const nuevoTema: Tema = this.tema() === 'dark' ? 'light' : 'dark';
    this.establecerTema(nuevoTema);
  }

  private inicializarTema(): void {
    const temaGuardado = localStorage.getItem(this.storageKey);

    if (temaGuardado === 'dark' || temaGuardado === 'light') {
      this.establecerTema(temaGuardado);
      return;
    }

    this.establecerTema('light');
  }

  private establecerTema(tema: Tema): void {
    this.tema.set(tema);
    localStorage.setItem(this.storageKey, tema);
  }
}
