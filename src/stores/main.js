import { defineStore } from 'pinia';

export const useMainStore = defineStore('main', {
  state: () => ({
    users: [
      { id: 1, fullName: 'Juan Pérez', cargo: 'Administrador' },
      { id: 2, fullName: 'María Gómez', cargo: 'Funcionario' },
      { id: 3, fullName: 'Carlos López', cargo: 'Normal' },
    ],
  }),
  actions: {
    addUser(user) {
      this.users.push(user);
    },
    getUsers() {
      return this.users;
    },
  },
});