import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

interface RespuestaMensajeApi {
  message: string;
}

@Component({
  selector: 'app-recuperar-contrasena',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './recuperar-contrasena.html',
  styleUrl: './recuperar-contrasena.css'
})
export class RecuperarContrasena {
  readonly esRestablecimiento: boolean;
  readonly token: string;
  ocultarPassword = true;
  ocultarConfirmacion = true;
  enviando = false;
  completado = false;
  mensaje = '';
  mensajeError = '';

  readonly formularioSolicitud;
  readonly formularioRestablecimiento;

  constructor(
    formBuilder: FormBuilder,
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.esRestablecimiento = this.route.snapshot.data['modo'] === 'restablecer';
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    const email = this.route.snapshot.queryParamMap.get('email') ?? '';

    this.formularioSolicitud = formBuilder.nonNullable.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.formularioRestablecimiento = formBuilder.nonNullable.group({
      email: [email, [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(12), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)]],
      password_confirmation: ['', [Validators.required]]
    });
  }

  get enlaceValido(): boolean {
    return !this.esRestablecimiento || Boolean(this.token);
  }

  get passwordsCoinciden(): boolean {
    const datos = this.formularioRestablecimiento.getRawValue();
    return datos.password === datos.password_confirmation;
  }

  solicitarEnlace(): void {
    if (this.formularioSolicitud.invalid) {
      this.formularioSolicitud.markAllAsTouched();
      return;
    }

    this.limpiarMensajes();
    this.enviando = true;
    this.http
      .post<RespuestaMensajeApi>('/api/auth/forgot-password', {
        email: this.formularioSolicitud.getRawValue().email.trim()
      })
      .pipe(finalize(() => (this.enviando = false)))
      .subscribe({
        next: (respuesta) => {
          this.completado = true;
          this.mensaje = respuesta.message;
        },
        error: (error: HttpErrorResponse) => {
          this.mensajeError = this.obtenerMensajeError(error);
        }
      });
  }

  guardarNuevaContrasena(): void {
    if (this.formularioRestablecimiento.invalid || !this.passwordsCoinciden || !this.token) {
      this.formularioRestablecimiento.markAllAsTouched();
      if (!this.passwordsCoinciden) {
        this.mensajeError = 'Las contrasenas no coinciden.';
      }
      return;
    }

    this.limpiarMensajes();
    this.enviando = true;
    this.http
      .post<RespuestaMensajeApi>('/api/auth/reset-password', {
        token: this.token,
        ...this.formularioRestablecimiento.getRawValue(),
        email: this.formularioRestablecimiento.getRawValue().email.trim()
      })
      .pipe(finalize(() => (this.enviando = false)))
      .subscribe({
        next: (respuesta) => {
          this.completado = true;
          this.mensaje = respuesta.message;
        },
        error: (error: HttpErrorResponse) => {
          this.mensajeError = this.obtenerMensajeError(error);
        }
      });
  }

  irAlIngreso(): void {
    void this.router.navigate(['/ingresar']);
  }

  private limpiarMensajes(): void {
    this.mensaje = '';
    this.mensajeError = '';
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (error.status === 429) {
      return 'Realizaste varios intentos. Espera un minuto antes de volver a intentar.';
    }

    return error.error?.message ?? 'No pudimos completar la solicitud. Intenta nuevamente.';
  }
}
