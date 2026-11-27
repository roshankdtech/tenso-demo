import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { testI18n } from '@/test/i18n'
import AppInput from './AppInput.vue'

function mountPassword() {
  return mount(AppInput, {
    props: {
      id: 'password',
      label: 'Password',
      type: 'password',
      showToggle: true,
      modelValue: '',
    },
    global: { plugins: [testI18n] },
  })
}

describe('AppInput password toggle', () => {
  it('hides the password by default', () => {
    const wrapper = mountPassword()
    expect(wrapper.find('input').attributes('type')).toBe('password')
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('false')
  })

  it('shows and hides the password when the toggle is pressed', async () => {
    const wrapper = mountPassword()
    const toggle = wrapper.find('button')

    await toggle.trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('text')
    expect(toggle.attributes('aria-label')).toBe('パスワードを隠す')
    expect(toggle.attributes('aria-pressed')).toBe('true')

    await toggle.trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('password')
    expect(toggle.attributes('aria-label')).toBe('パスワードを表示')
  })

  it('shows no toggle on a plain text field', () => {
    const wrapper = mount(AppInput, {
      props: { id: 'username', label: 'Username' },
      global: { plugins: [testI18n] },
    })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
