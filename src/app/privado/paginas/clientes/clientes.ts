import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privado-clientes',
  // Componente informativo para la seccion de clientes.
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css'
})
export class PrivadoClientes {}
