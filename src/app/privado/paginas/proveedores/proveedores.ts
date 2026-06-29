import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SesionServicio } from '../../../servicios/sesion.servicio';

@Component({
  selector: 'app-privado-proveedores',
  // Componente informativo para la seccion de proveedores.
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css'
})
export class PrivadoProveedores implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    if (this.esVendedor && !this.router.url.includes('/privado/proveedores/registros')) {
      void this.router.navigate(['/privado/proveedores/registros']);
    }
  }

  get esVendedor(): boolean {
    return this.sesionServicio.usuarioEsRol('vendedor');
  }
}
