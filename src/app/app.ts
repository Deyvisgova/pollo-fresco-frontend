import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BarraNavegacion } from './diseno-publico/estructura/barra-navegacion/barra-navegacion';
import { PiePagina } from './diseno-publico/estructura/pie-pagina/pie-pagina';
import { PreCabecera } from './diseno-publico/estructura/pre-cabecera/pre-cabecera';
import { TemaServicio } from './servicios/tema.servicio';

@Component({
  selector: 'app-root',
  imports: [BarraNavegacion, PiePagina, PreCabecera, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front-pollo-fresco');
  protected readonly esModuloPrivado = signal(false);

  constructor(
    private readonly router: Router,
    private readonly temaServicio: TemaServicio
  ) {
    this.temaServicio.temaActual();
    this.actualizarVisibilidadEstructura(this.router.url);

    this.router.events
      .pipe(filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd))
      .subscribe((evento) => this.actualizarVisibilidadEstructura(evento.urlAfterRedirects));
  }

  private actualizarVisibilidadEstructura(url: string): void {
    this.esModuloPrivado.set(url.startsWith('/privado'));
  }
}
