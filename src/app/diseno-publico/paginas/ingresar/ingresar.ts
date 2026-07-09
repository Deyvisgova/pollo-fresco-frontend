import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  AutenticacionServicio,
  RespuestaLoginApi,
  RolDisponibleLogin
} from '../../../servicios/autenticacion.servicio';
import { SesionServicio } from '../../../servicios/sesion.servicio';

@Component({
  selector: 'app-ingresar',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './ingresar.html',
  styleUrl: './ingresar.css'
})
export class Ingresar {
  hidePassword = true;
  mensajeError = '';
  estaCargando = false;
  rolesDisponibles: RolDisponibleLogin[] = [];
  desafioSeleccionRol = '';
  esperandoSeleccionRol = false;
  esperandoCodigoCorreo = false;
  desafioCodigoCorreo = '';
  correoEnmascarado = '';
  codigoCorreo = '';
  confiarDispositivo = true;
  formulario!: FormGroup;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly autenticacionServicio: AutenticacionServicio,
    private readonly sesionServicio: SesionServicio,
    private readonly router: Router
  ) {
    this.formulario = this.formBuilder.nonNullable.group({
      usuario: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  enviarIngreso(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.mensajeError = '';
    this.estaCargando = true;

    this.enviarCredenciales();
  }

  seleccionarRol(rol: RolDisponibleLogin): void {
    if (!this.desafioSeleccionRol || this.estaCargando) {
      return;
    }

    this.mensajeError = '';
    this.estaCargando = true;
    this.autenticacionServicio
      .seleccionarRol(this.desafioSeleccionRol, rol.role)
      .pipe(finalize(() => (this.estaCargando = false)))
      .subscribe({
        next: (respuesta) => this.procesarRespuestaIngreso(respuesta),
        error: (error) => {
          this.mensajeError = error?.error?.message ?? 'No pudimos seleccionar el rol.';
        }
      });
  }

  volverACredenciales(): void {
    this.esperandoSeleccionRol = false;
    this.esperandoCodigoCorreo = false;
    this.desafioCodigoCorreo = '';
    this.codigoCorreo = '';
    this.correoEnmascarado = '';
    this.rolesDisponibles = [];
    this.desafioSeleccionRol = '';
  }

  verificarCodigoCorreo(): void {
    if (!this.desafioCodigoCorreo || !/^\d{6}$/.test(this.codigoCorreo.trim())) {
      this.mensajeError = 'Ingresa el codigo de 6 digitos enviado a tu correo.';
      return;
    }

    this.mensajeError = '';
    this.estaCargando = true;
    this.autenticacionServicio
      .verificarCodigoCorreo(
        this.desafioCodigoCorreo,
        this.codigoCorreo.trim(),
        this.confiarDispositivo
      )
      .pipe(finalize(() => (this.estaCargando = false)))
      .subscribe({
        next: () => this.completarIngreso(),
        error: (error) => {
          this.mensajeError = error?.error?.message ?? 'No pudimos validar el codigo enviado.';
        }
      });
  }

  private enviarCredenciales(): void {
    this.autenticacionServicio
      .iniciarSesion(this.formulario.getRawValue())
      .pipe(finalize(() => (this.estaCargando = false)))
      .subscribe({
        next: (respuesta) => this.procesarRespuestaIngreso(respuesta),
        error: (error) => {
          this.mensajeError = error?.error?.message ?? 'No pudimos iniciar sesion. Verifica tus datos.';
        }
      });
  }

  private procesarRespuestaIngreso(respuesta: RespuestaLoginApi): void {
    if (respuesta.requires_role_selection && respuesta.roles?.length && respuesta.role_challenge) {
      this.rolesDisponibles = respuesta.roles;
      this.desafioSeleccionRol = respuesta.role_challenge;
      this.esperandoSeleccionRol = true;
      return;
    }

    if (respuesta.requires_email_code) {
      this.esperandoSeleccionRol = false;
      this.esperandoCodigoCorreo = true;
      this.desafioCodigoCorreo = respuesta.challenge ?? '';
      this.correoEnmascarado = respuesta.masked_email ?? '';
      this.codigoCorreo = '';
      return;
    }

    this.completarIngreso();
  }

  private completarIngreso(): void {
          if (this.sesionServicio.usuarioEsRol('delivery')) {
            void this.router.navigate(['/privado/pedidos']);
            return;
          }

          if (this.sesionServicio.usuarioEsRol('vendedor')) {
            void this.router.navigate(['/privado/pedidos']);
            return;
          }

          if (!this.sesionServicio.usuarioEsRol('admin')) {
            this.sesionServicio.limpiarSesion();
            this.mensajeError =
              'Tu cuenta no tiene permisos para ingresar al panel.';
            return;
          }

          void this.router.navigate(['/privado']);
  }
}
