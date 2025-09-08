// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { requireAuth } from "../guards/authGuard";
import { requireRole } from "../guards/roleGuard";

import LoginView from "../views/LoginView.vue";
import NotFoundView from "../views/NotFoundView.vue";

// Layouts
import AdminLayout from "../components/layout/AdminLayout.vue";
import UserLayout from "../components/layout/UserLayout.vue";

// Vistas (lazy)
const UserDashboardView = () => import("../views/user/DashboardView.vue");

// ⬇️ NUEVO: lazy views admin
const AdminDashboardView = () => import("../views/admin/DashboardView.vue");
const UserListView = () => import("../views/admin/UserListView.vue");
const CreateUserView = () => import("../views/admin/CreateUserView.vue");
const EditUserView = () => import("../views/admin/EditUserView.vue");
const DocumentOverviewView = () => import("../views/admin/DocumentOverviewView.vue");

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: LoginView },

    {
      path: "/admin",
      component: AdminLayout,
      beforeEnter: [requireAuth, requireRole(["Admin"])],
      children: [
          { path: "", name: "admin.dashboard", component: () => import("../views/admin/DashboardView.vue") },
          { path: "users", name: "admin.users", component: () => import("../views/admin/UserListView.vue") },
          { path: "users/create", name: "admin.users.create", component: () => import("../views/admin/CreateUserView.vue") },
          { path: "users/:id/edit", name: "admin.users.edit", component: () => import("../views/admin/EditUserView.vue"), props: true },
          { path: "docs", name: "admin.docs", component: () => import("../views/admin/DocumentOverviewView.vue") },
      ],
    },

    {
      path: "/",
      component: UserLayout,
      beforeEnter: [requireAuth],
      children: [
        { path: "", name: "user.dashboard", component: UserDashboardView },
      ],
    },

    { path: "/:pathMatch(.*)*", name: "not-found", component: NotFoundView },
  ],
});

export default router;
