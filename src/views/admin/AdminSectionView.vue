<template>
  <section class="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm">
    <div class="flex flex-col gap-2">
      <h2 class="text-2xl font-semibold text-slate-900">Administracion</h2>
      <p class="text-sm text-slate-500">Elige la seccion que deseas gestionar.</p>
    </div>

    <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
      <router-link
        :to="{ name: 'admin.docs' }"
        class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
      >
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <FolderIcon class="h-6 w-6" />
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-slate-900">Documentos</h3>
              <ArrowRightIcon class="h-5 w-5 text-slate-400 transition-all group-hover:text-indigo-500 group-hover:translate-x-1" />
            </div>
            <p class="mt-2 text-sm text-slate-600">
              Revisa colas, estados y movimientos de documentos.
            </p>
          </div>
        </div>
      </router-link>

      <router-link
        :to="{ name: 'admin.users' }"
        class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
      >
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <UserGroupIcon class="h-6 w-6" />
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-slate-900">Usuarios</h3>
              <ArrowRightIcon class="h-5 w-5 text-slate-400 transition-all group-hover:text-emerald-500 group-hover:translate-x-1" />
            </div>
            <p class="mt-2 text-sm text-slate-600">
              Administra cuentas, roles y accesos del sistema.
            </p>
          </div>
        </div>
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { ArrowRightIcon, FolderIcon, UserGroupIcon } from "@heroicons/vue/24/outline";
</script>
