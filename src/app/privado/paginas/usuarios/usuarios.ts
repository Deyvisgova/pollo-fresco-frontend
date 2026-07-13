import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmacionServicio } from '../../../servicios/confirmacion.servicio';
import { SesionServicio } from '../../../servicios/sesion.servicio';
import { UsuariosServicio, UsuarioApi } from '../../../servicios/usuarios.servicio';
import { SelectBonitoDirective } from '../../../compartido/directivas/select-bonito.directive';

interface UsuarioFormulario {
  rol_id: number;
  roles_permitidos: number[];
  nombres: string;
  apellidos: string;
  usuario: string;
  email: string;
  telefono: string;
  password: string;
  password_confirmation: string;
  activo: boolean;
}

@Component({
  selector: 'app-privado-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectBonitoDirective],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class PrivadoUsuarios implements OnInit {
  usuarios: UsuarioApi[] = [];
  cargando = false;
  mensajeError = '';
  terminoBusqueda = '';
  modoEdicion = false;
  mostrarModal = false;
  mostrarPassword = false;
  mostrarConfirmacion = false;
  consultaDni = '';
  consultaCargando = false;
  usuarioSeleccionado: UsuarioApi | null = null;
  formulario: UsuarioFormulario = this.crearFormularioVacio();

  roles = [
    { id: 1, nombre: 'Administrador' },
    { id: 2, nombre: 'Vendedor' },
    { id: 3, nombre: 'Delivery' }
  ];

  constructor(
    private readonly usuariosServicio: UsuariosServicio,
    private readonly confirmacionServicio: ConfirmacionServicio,
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  get usuariosFiltrados(): UsuarioApi[] {
    const termino = this.terminoBusqueda.trim().toLowerCase();
    if (!termino) {
      return this.usuarios;
    }

    return this.usuarios.filter((usuario) => {
      const contenido = [
        usuario.usuario_id,
        usuario.nombres,
        usuario.apellidos,
        usuario.usuario,
        usuario.email,
        usuario.telefono ?? '',
        this.obtenerNombreRol(usuario.rol_id),
        ...this.obtenerRolesPermitidos(usuario).map((rolId) => this.obtenerNombreRol(rolId)),
        usuario.activo ? 'activo' : 'inactivo'
      ]
        .join(' ')
        .toLowerCase();
      return contenido.includes(termino);
    });
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.usuariosServicio.listar().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
        this.cargando = false;
      },
      error: () => {
        this.mensajeError =
          'No se pudo cargar la lista de usuarios. Intenta nuevamente.';
        this.cargando = false;
      }
    });
  }

  iniciarNuevo(): void {
    this.modoEdicion = false;
    this.usuarioSeleccionado = null;
    this.formulario = this.crearFormularioVacio();
    this.consultaDni = '';
    this.mostrarPassword = false;
    this.mostrarConfirmacion = false;
    this.mostrarModal = true;
  }

  seleccionarUsuario(usuario: UsuarioApi): void {
    this.modoEdicion = true;
    this.usuarioSeleccionado = usuario;
    this.formulario = {
      rol_id: Number(usuario.rol_id),
      roles_permitidos: this.obtenerRolesPermitidos(usuario),
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      usuario: usuario.usuario,
      email: usuario.email,
      telefono: usuario.telefono ?? '',
      password: '',
      password_confirmation: '',
      activo: usuario.activo
    };
    this.consultaDni = '';
    this.mostrarPassword = false;
    this.mostrarConfirmacion = false;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.mostrarPassword = false;
    this.mostrarConfirmacion = false;
    this.consultaDni = '';
    this.consultaCargando = false;
  }

  consultarDniReniec(): void {
    const dni = this.consultaDni.replace(/\D/g, '');
    if (dni.length !== 8) {
      this.mensajeError = 'Ingresa un DNI valido de 8 digitos para consultar RENIEC.';
      return;
    }

    this.consultaCargando = true;
    this.mensajeError = '';

    this.http
      .get<{ data?: Record<string, unknown>; success?: boolean; message?: string }>(
        `/api/documentos/dni/${dni}`,
        { headers: this.obtenerHeaders() }
      )
      .subscribe({
        next: (respuesta) => {
          const datos = respuesta?.data ?? {};
          if (!respuesta?.success || !Object.keys(datos).length) {
            this.mensajeError = respuesta?.message || 'No se encontraron datos para ese DNI.';
            return;
          }

          this.autocompletarDesdeDni(datos, dni);
          this.consultaDni = '';
        },
        error: () => {
          this.mensajeError = 'No pudimos conectar con RENIEC. Revisa el DNI e intenta nuevamente.';
        },
        complete: () => {
          this.consultaCargando = false;
        }
      });
  }

  guardarUsuario(): void {
    if (this.modoEdicion && this.usuarioSeleccionado) {
      this.actualizarUsuario();
    } else {
      this.crearUsuario();
    }
  }

  crearUsuario(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.usuariosServicio.crear(this.obtenerPayload()).subscribe({
      next: (usuario) => {
        this.usuarios = [usuario, ...this.usuarios];
        this.cargando = false;
        this.cerrarModal();
        this.formulario = this.crearFormularioVacio();
      },
      error: (error) => {
        this.mensajeError = this.obtenerMensajeError(error);
        this.cargando = false;
      }
    });
  }

  actualizarUsuario(): void {
    if (!this.usuarioSeleccionado) {
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.usuariosServicio
      .actualizar(this.usuarioSeleccionado.usuario_id, this.obtenerPayload())
      .subscribe({
        next: (usuarioActualizado) => {
          this.usuarios = this.usuarios.map((usuario) =>
            usuario.usuario_id === usuarioActualizado.usuario_id
              ? usuarioActualizado
              : usuario
          );
          this.cargando = false;
          this.cerrarModal();
          this.formulario = this.crearFormularioVacio();
        },
        error: (error) => {
          this.mensajeError = this.obtenerMensajeError(error);
          this.cargando = false;
        }
      });
  }

  async eliminarUsuario(usuario: UsuarioApi): Promise<void> {
    const confirmacion = await this.confirmacionServicio.confirmar({
      titulo: 'Eliminar usuario',
      mensaje: `Deseas eliminar a ${usuario.nombres} ${usuario.apellidos}?`,
      detalle: 'Esta accion no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      tipo: 'peligro'
    });
    if (!confirmacion) {
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.usuariosServicio.eliminar(usuario.usuario_id).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter(
          (item) => item.usuario_id !== usuario.usuario_id
        );
        this.cargando = false;
        if (this.usuarioSeleccionado?.usuario_id === usuario.usuario_id) {
          this.iniciarNuevo();
        }
      },
      error: (error) => {
        this.mensajeError = this.obtenerMensajeError(error);
        this.cargando = false;
      }
    });
  }

  cambiarEstado(usuario: UsuarioApi): void {
    const actualizado = {
      ...usuario,
      activo: !usuario.activo
    };
    const payload = this.crearPayloadDesdeUsuario(actualizado);

    this.cargando = true;
    this.mensajeError = '';
    this.usuariosServicio.actualizar(usuario.usuario_id, payload).subscribe({
      next: (usuarioActualizado) => {
        this.usuarios = this.usuarios.map((item) =>
          item.usuario_id === usuarioActualizado.usuario_id ? usuarioActualizado : item
        );
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = this.obtenerMensajeError(error);
        this.cargando = false;
      }
    });
  }

  obtenerNombreRol(rolId: number): string {
    return this.roles.find((rol) => rol.id === rolId)?.nombre ?? 'Sin rol';
  }

  obtenerRolesPermitidos(usuario: UsuarioApi): number[] {
    const roles = usuario.roles_permitidos?.length
      ? usuario.roles_permitidos
      : usuario.roles_disponibles?.map((rol) => rol.id) ?? [usuario.rol_id];

    return Array.from(new Set([...roles, usuario.rol_id].map(Number))).filter((rolId) =>
      this.roles.some((rol) => rol.id === rolId)
    );
  }

  rolPermitido(rolId: number): boolean {
    return this.formulario.roles_permitidos.includes(rolId);
  }

  alternarRolPermitido(rolId: number): void {
    if (this.rolPermitido(rolId)) {
      if (rolId === Number(this.formulario.rol_id)) {
        return;
      }

      this.formulario.roles_permitidos = this.formulario.roles_permitidos.filter((id) => id !== rolId);
      return;
    }

    this.formulario.roles_permitidos = [...this.formulario.roles_permitidos, rolId];
  }

  sincronizarRolPrincipal(): void {
    const rolPrincipal = Number(this.formulario.rol_id);
    if (!this.formulario.roles_permitidos.includes(rolPrincipal)) {
      this.formulario.roles_permitidos = [...this.formulario.roles_permitidos, rolPrincipal];
    }
  }

  get passwordsCoinciden(): boolean {
    return this.formulario.password === this.formulario.password_confirmation;
  }

  get passwordValida(): boolean {
    if (this.modoEdicion && !this.formulario.password) {
      return true;
    }
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(this.formulario.password);
  }

  get formularioValido(): boolean {
    const usuario = this.formulario.usuario.trim();
    const nombres = this.formulario.nombres.trim();
    const apellidos = this.formulario.apellidos.trim();
    const email = this.formulario.email.trim();
    const emailValido = /^[^@]+@[^@]+\.[^@]+$/.test(email);

    if (!usuario || !nombres || !apellidos || !emailValido) {
      return false;
    }

    if (!this.modoEdicion || this.formulario.password) {
      return this.passwordValida && this.passwordsCoinciden;
    }

    return true;
  }

  private crearFormularioVacio(): UsuarioFormulario {
    return {
      rol_id: 2,
      roles_permitidos: [2],
      nombres: '',
      apellidos: '',
      usuario: '',
      email: '',
      telefono: '',
      password: '',
      password_confirmation: '',
      activo: true
    };
  }

  private autocompletarDesdeDni(datos: Record<string, unknown>, dni: string): void {
    const apellidoPaterno = String(datos['apellido_paterno'] ?? '');
    const apellidoMaterno = String(datos['apellido_materno'] ?? '');
    const nombres = String(datos['nombres'] ?? datos['nombre'] ?? '');
    const apellidos = `${apellidoPaterno} ${apellidoMaterno}`.trim() || String(datos['apellido'] ?? '');

    this.formulario = {
      ...this.formulario,
      nombres: nombres || String(datos['nombre_completo'] ?? this.formulario.nombres),
      apellidos: apellidos || this.formulario.apellidos,
      usuario: this.formulario.usuario || this.crearUsuarioSugerido(nombres, apellidos, dni)
    };
  }

  private crearUsuarioSugerido(nombres: string, apellidos: string, dni: string): string {
    const primerNombre = nombres.trim().split(/\s+/)[0] ?? '';
    const primerApellido = apellidos.trim().split(/\s+/)[0] ?? '';
    const base = `${primerNombre}.${primerApellido}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.]/g, '')
      .toLowerCase();

    return base || dni;
  }

  private obtenerPayload() {
    const password = this.formulario.password.trim();
    const confirmacion = this.formulario.password_confirmation.trim();

    return {
      ...this.formulario,
      password: password ? password : null,
      password_confirmation: password ? confirmacion : null,
      rol_id: Number(this.formulario.rol_id),
      roles_permitidos: Array.from(new Set([...this.formulario.roles_permitidos, Number(this.formulario.rol_id)]))
    };
  }

  private crearPayloadDesdeUsuario(usuario: UsuarioApi) {
    return {
      rol_id: Number(usuario.rol_id),
      roles_permitidos: this.obtenerRolesPermitidos(usuario),
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      usuario: usuario.usuario,
      email: usuario.email,
      telefono: usuario.telefono ?? '',
      password: null,
      password_confirmation: null,
      activo: usuario.activo
    };
  }

  private obtenerMensajeError(error: any): string {
    if (error?.status === 401) {
      return 'Tu sesion expiro. Inicia sesion nuevamente para continuar.';
    }

    if (error?.status === 422 && error?.error?.errors) {
      const mensajes = Object.values(error.error.errors)
        .flat()
        .filter((mensaje) => typeof mensaje === 'string');
      if (mensajes.length > 0) {
        return `Revisa los datos: ${mensajes.join('  ')}`;
      }
    }

    return 'No se pudo completar la accion. Intenta nuevamente.';
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
