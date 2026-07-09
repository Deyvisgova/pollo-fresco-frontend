import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SesionServicio } from '../servicios/sesion.servicio';

export const seguridadInterceptor: HttpInterceptorFn = (request, next) => {
  const sesion = inject(SesionServicio);
  const router = inject(Router);
  const token = sesion.obtenerToken();
  const solicitud = token && !request.headers.has('Authorization')
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(solicitud).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !request.url.includes('/auth/login')) {
        sesion.limpiarSesion();
        void router.navigate(['/ingresar']);
      }

      return throwError(() => error);
    })
  );
};
