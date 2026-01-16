// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { requireAuth, requireRole, requireAuthAndValidSession } from "../guards/authGuard";

import LoginView from "../views/LoginView.vue";
import NotFoundView from "../views/NotFoundView.vue";
import ChangePasswordView from "../views/ChangePasswordView.vue";

// Layouts
import AdminLayout from "../components/layout/AdminLayout.vue";
import UserLayout from "../components/layout/UserLayout.vue";

// Vistas (lazy)
const UserDashboardView = () => import("../views/user/DashboardView.vue");

// ⬇️ NUEVO: lazy views admin
const AdminDashboardView = () => import("../views/admin/DashboardView.vue");
const AdminSectionView = () => import("../views/admin/AdminSectionView.vue");
const UserListView = () => import("../views/admin/UserListView.vue");
const CreateUserView = () => import("../views/admin/CreateUserView.vue");
const EditUserView = () => import("../views/admin/EditUserView.vue");
const DocumentOverviewView = () => import("../views/admin/DocumentOverviewView.vue");

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Ruta pública - Login
    { path: "/login", name: "login", component: LoginView },

    // Nueva ruta - Cambio de contraseña (requiere autenticación)
    {
      path: "/change-password",
      name: "change-password",
      component: ChangePasswordView,
      beforeEnter: [requireAuth]
    },

    // Rutas admin - requieren auth + rol Admin
    {
      path: "/admin",
      component: AdminLayout,
      beforeEnter: [requireAuthAndValidSession, requireRole(["Admin"])],
      children: [
        { path: "", name: "admin.home", component: AdminSectionView },
        { path: "dashboard", name: "admin.dashboard", component: AdminDashboardView },
        { path: "users", name: "admin.users", component: () => import("../views/admin/UserListView.vue") },
        { path: "users/create", name: "admin.users.create", component: () => import("../views/admin/CreateUserView.vue") },
        { path: "users/:id/edit", name: "admin.users.edit", component: () => import("../views/admin/EditUserView.vue"), props: true },
        { path: "docs", name: "admin.docs", component: () => import("../views/admin/DocumentOverviewView.vue") },
        { path: "migration", name: "admin.migration", component: () => import("../views/admin/MigrationAdminView.vue") },
      ],
    },

    // Rutas user - requieren auth solamente
    {
      path: "/",
      component: UserLayout,
      beforeEnter: [requireAuthAndValidSession],
      children: [
        { path: "", name: "user.dashboard", component: UserDashboardView },
      ],
    },

    // Catch-all - 404
    { path: "/:pathMatch(.*)*", name: "not-found", component: NotFoundView },
  ],
});

export default router;
