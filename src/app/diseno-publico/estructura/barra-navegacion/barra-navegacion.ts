import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ConfiguracionEmpresaServicio } from '../../../servicios/configuracion-empresa.servicio';

@Component({
  selector: 'app-barra-navegacion',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatIconModule, RouterLink, RouterLinkActive],
  templateUrl: './barra-navegacion.html',
  styleUrl: './barra-navegacion.css'
})
export class BarraNavegacion {
  menuAbierto = false;

  readonly configuracionEmpresa;
  readonly mostrarLogo;
  readonly inicialesEmpresa;

  constructor(private readonly configuracionEmpresaServicio: ConfiguracionEmpresaServicio) {
    this.configuracionEmpresa = this.configuracionEmpresaServicio.configuracion;
    this.mostrarLogo = computed(() => Boolean(this.configuracionEmpresa().logoUrl));
    this.inicialesEmpresa = computed(() => {
      const palabras = this.configuracionEmpresa().nombreEmpresa.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      return palabras.map((palabra) => palabra[0]?.toUpperCase() ?? '').join('') || 'PF';
    });
  }

  alternarMenu(): void { this.menuAbierto = !this.menuAbierto; }
  cerrarMenu(): void { this.menuAbierto = false; }
}
