import { Routes } from '@angular/router';
import { Clientes } from './diseno-publico/paginas/clientes/clientes';
import { Contacto } from './diseno-publico/paginas/contacto/contacto';
import { Ingresar } from './diseno-publico/paginas/ingresar/ingresar';
import { Inicio } from './diseno-publico/paginas/inicio/inicio';
import { Nosotros } from './diseno-publico/paginas/nosotros/nosotros';
import { Productos } from './diseno-publico/paginas/productos/productos';
import { PrivadoLayout } from './privado/privado-layout/privado-layout';
import { PrivadoClientes } from './privado/paginas/clientes/clientes';
import { PrivadoClientesCrud } from './privado/paginas/clientes/subpaginas/clientes-crud';
import { PrivadoConfiguracion } from './privado/paginas/configuracion/configuracion';
import { PrivadoGastos } from './privado/paginas/gastos/gastos';
import { PrivadoInicio } from './privado/paginas/inicio/inicio';
import { PrivadoOtrosProductos } from './privado/paginas/otros-productos/otros-productos';
import { PrivadoOtrosProductosLotes } from './privado/paginas/otros-productos/subpaginas/otros-productos-lotes';
import { PrivadoOtrosProductosProductos } from './privado/paginas/otros-productos/subpaginas/otros-productos-productos';
import { PrivadoOtrosProductosVentasDiarias } from './privado/paginas/otros-productos/subpaginas/otros-productos-ventas-diarias';
import { PrivadoPedidos } from './privado/paginas/pedidos/pedidos';
import { PaginaPublicaAdmin } from './privado/paginas/pagina-publica/pagina-publica';
import { PrivadoProveedores } from './privado/paginas/proveedores/proveedores';
import { PrivadoProveedoresCrud } from './privado/paginas/proveedores/subpaginas/proveedores-crud';
import { PrivadoProveedoresPagos } from './privado/paginas/proveedores/subpaginas/proveedores-pagos';
import { PrivadoProveedoresRegistros } from './privado/paginas/proveedores/subpaginas/proveedores-registros';
import { PrivadoReportes } from './privado/paginas/reportes/reportes';
import { PrivadoUsuarios } from './privado/paginas/usuarios/usuarios';
import { PrivadoVenta } from './privado/paginas/venta/venta';
import { PrivadoVentaRegistros } from './privado/paginas/venta/subpaginas/venta-registros';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inicio'
  },
  {
    path: 'inicio',
    component: Inicio
  },
  {
    path: 'nosotros',
    component: Nosotros
  },
  {
    path: 'productos',
    component: Productos
  },
  {
    path: 'clientes',
    component: Clientes
  },
  {
    path: 'contacto',
    component: Contacto
  },
  {
    path: 'ingresar',
    component: Ingresar
  },
  {
    path: 'recuperar-contrasena',
    loadComponent: () =>
      import('./diseno-publico/paginas/recuperar-contrasena/recuperar-contrasena')
        .then((modulo) => modulo.RecuperarContrasena),
    data: { modo: 'solicitar' }
  },
  {
    path: 'restablecer-contrasena',
    loadComponent: () =>
      import('./diseno-publico/paginas/recuperar-contrasena/recuperar-contrasena')
        .then((modulo) => modulo.RecuperarContrasena),
    data: { modo: 'restablecer' }
  },
  // Ruta general para el panel administrativo con sus rutas hijas.
  {
    path: 'privado',
    component: PrivadoLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio'
      },
      {
        path: 'inicio',
        component: PrivadoInicio
      },
      {
        path: 'proveedores',
        component: PrivadoProveedores,
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'crud'
          },
          {
            path: 'crud',
            component: PrivadoProveedoresCrud
          },
          {
            path: 'registros',
            component: PrivadoProveedoresRegistros
          },
          {
            path: 'pagos',
            component: PrivadoProveedoresPagos
          }
        ]
      },
      {
        path: 'clientes',
        component: PrivadoClientes,
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'crud'
          },
          {
            path: 'crud',
            component: PrivadoClientesCrud
          }
        ]
      },
      {
        path: 'venta',
        component: PrivadoVenta
      },
      {
        path: 'venta-registros',
        component: PrivadoVentaRegistros
      },
      {
        path: 'pedidos',
        component: PrivadoPedidos
      },
      {
        path: 'otros-productos',
        component: PrivadoOtrosProductos,
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'lotes'
          },
          {
            path: 'lotes',
            component: PrivadoOtrosProductosLotes
          },
          {
            path: 'ventas-diarias',
            component: PrivadoOtrosProductosVentasDiarias
          },
          {
            path: 'productos',
            component: PrivadoOtrosProductosProductos
          }
        ]
      },
      {
        path: 'usuarios',
        component: PrivadoUsuarios
      },
      {
        path: 'gastos',
        component: PrivadoGastos
      },
      {
        path: 'configuracion',
        component: PrivadoConfiguracion
      },
      {
        path: 'pagina-publica',
        component: PaginaPublicaAdmin
      },
      {
        path: 'reportes',
        component: PrivadoReportes
      },
      {
        path: 'mantenimiento',
        loadComponent: () =>
          import('./privado/paginas/mantenimiento/mantenimiento')
            .then((modulo) => modulo.PrivadoMantenimiento)
      }
    ]
  }
];
