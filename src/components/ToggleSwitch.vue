<template>
  <button
    type="button"
    :disabled="disabled"
    @click="toggle"
    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
    :class="[
      modelValue ? 'bg-indigo-600' : 'bg-gray-200',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      'focus:ring-indigo-500'
    ]"
    role="switch"
    :aria-checked="modelValue"
  >
    <span class="sr-only">{{ label || 'Toggle switch' }}</span>
    <span
      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
      :class="modelValue ? 'translate-x-6' : 'translate-x-1'"
    ></span>
  </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const toggle = () => {
  if (props.disabled) return;

  const newValue = !props.modelValue;
  emit('update:modelValue', newValue);
  emit('change', newValue);
};
</script>